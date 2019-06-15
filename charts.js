const svgns = "http://www.w3.org/2000/svg";
const CHART_PADDING = 10;
const POINT_SIZE = 10;
const POINT_COLOR = "#005a5f";
const HIGHLIGHT_COLOR = "#d98a86";

var scatterPlot

$.get("data2.json", json => {
    var data = parseData(json);
    makeCharts(data);
});

// utils
function median(arr) {
    const mid = Math.floor(arr.length / 2),
          nums = [...arr].sort((a, b) => a - b);
    return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

function parseData(data) {
    /* 
    updated portions of tinder data

    'Messages' : [
         {
             'date' : <string=ISO of first message>,-1 if none
             'match_id' : <string>,
             'messages': [<Message>],
             'opens_on_first_message' : <int>,
             'median_time_between_messages' : <int>,-1 if < 2
             'number_of_messages' : <int>,
             'gave_phone_number' : <bool>
         }
     ...],
     ...,
     'max_opens_per_day': <int>,
     'max_median_time_between_messages' : <int>,
    */

    data.Messages.map(match => {
        let times_between_messages = match.messages.map((msg, i) => {
            if (i + 1 >= match.messages.length) {
                return -1;
            }
            let date1 = new Date(msg.sent_date);
            let date2 = new Date(match.messages[i + 1].sent_date);
            return date2 - date1;
        });
        match["median_time_between_messages"] = match.messages.length > 1 ? median(times_between_messages.filter(x => x >= 0)) : -1;
        match["number_of_messages"] = match.messages.length;
        match["date"] = match.messages.length > 0 ? new Date(match.messages[0].sent_date).toISOString().split("T")[0] : -1;
        match["opens_on_first_message"] = data.Usage.app_opens[match.date];
        // TODO
        match["gave_phone_number"] = undefined;

    });

    data["max_median_time_between_messages"] = Math.max(...data.Messages.map(m => m["median_time_between_messages"]));
    data["max_opens_per_day"] = Math.max(...Object.values(data.Usage.app_opens));

    return data;
}

function makeCharts(data) {
    console.log(data);
    let container = document.getElementById("scatter-container");
    scatterPlot = new ScatterPlot(container, data);
}

class ScatterPlot {
    constructor(_cont, data) {
        this.cont = _cont;

        this.svg = document.createElementNS(svgns, "svg");
        this.svg.setAttribute("width", this.cont.offsetWidth);
        this.svg.setAttribute("height", this.cont.offsetHeight);
        this.cont.appendChild(this.svg);
        this.g = document.createElementNS(svgns, "g");
        this.svg.appendChild(this.g);

        this.maxX = data.max_opens_per_day;
        this.maxY = data.max_median_time_between_messages;
        this.points = [];


        // make points
        let quad = { "g" : this.g,
                     "x" : CHART_PADDING,
                     "y" : CHART_PADDING,
                     "w" : this.cont.offsetWidth - (CHART_PADDING * 2),
                     "h" : this.cont.offsetHeight - (CHART_PADDING * 2),
                     "maxX" : this.maxX,
                     "maxY" : this.maxY
                   }
        data.Messages.map( match => {
            let pdata = { "x" : match.opens_on_first_message,
                          "y" : match.median_time_between_messages,
                          "z" : match.gave_phone_number,
                          "r" : match.number_of_messages,
                          "xLabel" : "Opens on first message: ",
                          "yLabel" : "Median time between messages: ",
                          "zLabel" : "Gave phone number?: ",
                          "rLabel" : "Number of messages: "
            }
            this.points.push(new MatchPoint(quad, pdata));
        });
        
        console.log(this);
    }

    draw() {
        // draw axes, labels, grid(?), &c.
        // draw points
    }
}

class MatchPoint { 
    /* quadrant, var values, not coordinates, which it calculates itself
        quadrant : { 'g' : <svg::g>,
                     'x' : <number> starting x value for quadrant,
                     'y' : <number> starting y value for quadrant,
                     'w' : <number> width of quadrant,
                     'h' : <number> height of quadrant,
                     'maxX' : <number> max x value in quadrant,
                     'maxY' : <number> max y value in quadrant
                   }

        pdata : { 'x' : <number>,
                  'y' : <number>,
                  'z' : <bool>,
                  'r' : <number>,
                  'xLabel' : <string>,
                  'yLabel' : <string>,
                  'zLabel' : <string>,
                  'rLabel' : <string>,
                }
    */
                
    constructor(_quad, _pdata) {
        this.quad = _quad;        
        this.pdata = _pdata;
        // should assert these are well-enough formed to visualize

        this.xStep = this.quad.w / this.quad.maxX;
        this.yStep = this.quad.h / this.quad.maxY;

        this.xCoord = this.pdata.x * this.xStep;
        this.yCoord = this.pdata.y * this.yStep;

        this.point = document.createElementNS(svgns, "circle");
        this.point.setAttribute("cx", this.quad.x + this.xCoord);
        this.point.setAttribute("cy", this.quad.y + (this.quad.h - this.yCoord));
        this.point.setAttribute("r", POINT_SIZE + (this.pdata.r * POINT_SIZE / 16));
        this.point.setAttribute("fill", this.pdata.z ? HIGHLIGHT_COLOR : POINT_COLOR);
        this.point.setAttribute("stroke", HIGHLIGHT_COLOR);
        this.point.setAttribute("stroke-width", 2);
        this.quad.g.appendChild(this.point);
        this.point.onmouseover = () => this.displayInfo(this.pdata);
        var that = this;
    }

    draw() {
    }

    displayInfo(pdata) {
        console.clear();
        console.log(pdata.xLabel + pdata.x);
        console.log(pdata.yLabel + pdata.y);
        console.log(pdata.zLabel + pdata.z);
        console.log(pdata.rLabel + pdata.r);
    }
}
