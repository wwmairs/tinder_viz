const svgns = "http://www.w3.org/2000/svg";
const CHART_PADDING = 20;
const POINT_SIZE = 10;
const LINE_POINT_SIZE = 2;
const COLORS = {
    "darkBlue"  : "#4500EF",
    "green"     : "#00FF8B",
    "red"       : "#FD297B",
    "yellow"    : "#FFED98",
    "lightBlue" : "#97DCFF"
};
const POINT_COLOR = COLORS.red;
const HIGHLIGHT_COLOR = COLORS.yellow;;

var scatterPlot;
var lineChart;

$.get("data2.json", json => {
    var data = parseData(json);
    makeCharts(data);
});

// utils
function zipwith(f, xs, ys) {
    if (xs.length == 0) {
        return [];
    } else {
        let z = f(xs.pop(), ys.pop());
        return zipwith(f, xs, ys).concat([z]);
    }
}

function mean(arr) {
    const len = arr.length;
    return arr.reduce((x, y) => x + y) / len;
}

function median(arr) {
    const mid = Math.floor(arr.length / 2),
          nums = [...arr].sort((a, b) => a - b);
    return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

function ISOdelta(date2, date1) {
    return Math.round((new Date(date2) - new Date(date1))/(1000*60*60*24));
}


function msString(ms) {
    //console.log(new Date(ms));
    return ms;
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
    'first_day' : <string=ISO of first date in usage data>,
    'last_day' : <string=ISO of last date in usage data>,
    'max_likes_per_day' : <int>,
    'max_passes_per_dat' : <int>,
    'max_opens_per_day': <int>,
    'max_median_time_between_messages' : <int>,
    'averages_per_day' : {
         "opens" : {
             "years" : {<yyyy> : <number>, ...}, 
             "months" : {<yyyy-mm> : <number> ...} 
         },
         "likes" : ... ,
         "passes" : ... 
    },
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
    data["max_likes_per_day"] = Math.max(...Object.values(data.Usage.swipes_likes));
    data["max_passes_per_day"] = Math.max(...Object.values(data.Usage.swipes_passes));

    data["first_day"] = Object.keys(data.Usage.app_opens)[0];
    data["last_day"] = Object.keys(data.Usage.app_opens).slice(-1)[0];
    data["ISOdelta"] = ISOdelta(data.last_day, data.first_day);

    var totals = {
        "opens" : {"years" : {}, "months" : {}},
        "likes" : {"years" : {}, "months" : {}}, 
        "passes" : {"years" : {}, "months" : {}}
    }

    Object.entries(data.Usage.app_opens).map( (e) => {
        let y = e[0].slice(0, 4);
        let ym = e[0].slice(0, 7);
        let val = e[1];
        if (! (y in totals.opens.years)) {
            totals.opens.years[y] = [];
        }
        if (! (ym in totals.opens.months)) {
            totals.opens.months[ym] = [];
        }
        
        totals.opens.years[y].push(val);
        totals.opens.months[ym].push(val);
    });
    Object.entries(data.Usage.swipes_likes).map( (e) => {
        let y = e[0].slice(0, 4);
        let ym = e[0].slice(0, 7);
        let val = e[1];
        if (! (y in totals.likes.years)) {
            totals.likes.years[y] = [];
        }
        if (! (ym in totals.likes.months)) {
            totals.likes.months[ym] = [];
        }

        totals.likes.years[y].push(val);
        totals.likes.months[ym].push(val);
    });
    Object.entries(data.Usage.swipes_passes).map( (e) => {
        let y = e[0].slice(0, 4);
        let ym = e[0].slice(0, 7);
        let val = e[1];
        if (! (y in totals.passes.years)) {
            totals.passes.years[y] = [];
        }
        if (! (ym in totals.passes.months)) {
            totals.passes.months[ym] = [];
        }

        totals.passes.years[y].push(val);
        totals.passes.months[ym].push(val);
    });

    var averagesPerDay = totals;
    Object.values(averagesPerDay).map((data) => {
        Object.entries(data.years).map((e)  => {
            let k = e[0];
            let v =  e[1];
            data.years[k] = v.reduce((x, y) => x + y) / v.length
        });
        Object.entries(data.months).map((e)  => {
            let k = e[0];
            let v =  e[1];
            data.months[k] = v.reduce((x, y) => x + y) / v.length
        });
    });

    data["averages_per_day"] = averagesPerDay;
    return data;
}

function makeCharts(data) {
    scatterPlot = new ScatterPlot(document.getElementById("scatter-container"), data);
    cmv = new CMV(document.getElementById("cmv-container"), data);
}

class CMV {
    constructor(container, data) {
        // barCharts
        this.barChartDataSets = data.averages_per_day;
        this.conts = document.getElementsByClassName("cmv-chart-container");
        this.barCharts = [];
        this.lineCharts = [];
    
        Object.entries(this.barChartDataSets).map((set) => {
            this.barCharts.push(new BarChart(this.conts[this.barCharts.length], 
                                             set, 
                                             this));
        });

        // lineCharts
        this.lineChartDataSets = [["opens", data.Usage.app_opens],
                                  ["likes", data.Usage.swipes_likes],
                                  ["passes", data.Usage.swipes_passes]];

        this.lineChartDataSets.map((set) => {
            this.lineCharts.push(
                new LineChart(this.conts[this.barCharts.length + this.lineCharts.length],
                set,
                this));
        });


        this.drawAllYears();;
    }
    // should each view have the same scale?
    setView(start, end=start) {
        this.start = start;
        this.end = end;
        if (start.length == 4) {
            this.showBarCharts();
            this.barCharts.map((bc) => bc.setView(start, end));
        } else if (start.length == 7) {
            this.showLineCharts();
            this.lineCharts.map((lc) => lc.setView(start, end));
        }
    }

    highlightPoint(label) {
        this.lineCharts.map((lc) => lc.highlightPoint(label));
    }

    dehighlightPoint(label) {
        this.lineCharts.map((lc) => lc.dehighlighPoint(label));
    }

    highlightBar(label) {
        this.barCharts.map((bc) => bc.highlightBar(label));
    } 

    dehighlightBar(label) {
        this.barCharts.map((bc) => bc.dehighlightBar(label));
    }

    drawAllYears() {
        this.showBarCharts();
        this.barCharts.map((bc) => bc.drawAllYears());
    }
    
    drawYears(startYear, endYear) {
        this.showBarCharts();
        this.barCharts.map((bc) => bc.drawYears(startYear, endYear));
    }

    drawYear(year) {
        this.showBarCharts();
        this.barCharts.map((bc) => bc.drawYear(year));
    }

    drawAllMonths() {
        this.showBarCharts();
        this.barCharts.map((bc) => bc.drawAllMonths());
    }

    drawMonths(startMonth, endMonth) {
        this.showBarCharts();
        this.barCharts.map((bc) => bc.drawMonths(startMonth, endMonth));
    }

    drawMonth(month) {
        this.showLineCharts();
        this.lineCharts.map((lc) => lc.drawMonth(month));
    }

    showBarCharts() {
        this.barCharts.map((bc) => {
            bc.cont.classList.remove("hidden");
        });
        this.lineCharts.map((lc) => {
            lc.cont.classList.add("hidden");
        });
    }

    showLineCharts() {
        this.barCharts.map((bc) => {
            bc.cont.classList.add("hidden");
        });
        this.lineCharts.map((lc) => {
            lc.cont.classList.remove("hidden");
        });
    }

}

class LineChart {
    constructor(_cont, data, cmv) {
        this.cont = _cont;
        this.set = data[1];
        this.cmv = cmv;
        this.titleContent = data[0];

        this.svg = document.createElementNS(svgns, "svg");
        this.svg.setAttribute("width", this.cont.offsetWidth);
        this.svg.setAttribute("height", this.cont.offsetHeight);
        this.cont.appendChild(this.svg);
        this.g = document.createElementNS(svgns, "g");
        this.svg.appendChild(this.g);
        this.line;
        this.title = document.createElementNS(svgns, "text");
        this.title.onclick = this.setViewOneUp;

        /* general idea:
           consider start date as x=0
           end date as x = end - start date, max x
           figure out for each data point what it's displacement from x=0 is, use as coord
           display months, weeks, on x axis
        */
    }

    hightlightPoint(label) {
        this.line.highlightPoint(label);
    }

    dehilightPoint(label) {
        this.line.dehighlightPoint(label);
    }

    setViewOneUp() {
        if (cmv.start == cmv.end) {
            if (cmv.start.length == 4) {
                cmv.drawAllYears();
            }
            if (cmv.start.length == 7) {
                cmv.setView(cmv.start.split("-")[0]);
            }
        }
    }

    setView(start, end=start) {
        this.drawMonth(start);
    }

    drawMonth(month) {
        this.drawDays(month + "-01", month + "-31");
    }

    drawAllDays() {
        this.draw(this.set);
    }

    drawDays(firstDay, lastDay) {
        let selectedData = {};
        Object.entries(this.set).map((e) => {
            let k = e[0];
            let v = e[1];
            let date = k.split("-");
            let date1 = firstDay.split("-");
            let date2 = lastDay.split("-");
            if ( (date[0] >= date1[0] && date[0] <= date2[0]) &&
                 (date[1] >= date1[1] && date[1] <= date2[1]) &&
                 (date[2] >= date1[2] && date[2] <= date2[2])) {
                selectedData[k] = v;
            }

        });
        this.draw(selectedData);
    }

    draw(set) {
        // make new data list
        if (this.line != undefined) {
            this.clear();
        }
        let firstDay = Object.entries(set)[0][0];
        let lastDay = Object.entries(set).slice(-1)[0][0];
        let maxX = ISOdelta(lastDay, firstDay);
        let maxY = Math.max(...Object.values(set));

        let quad = { "g" : this.g,
                     "x" : CHART_PADDING,
                     "y" : CHART_PADDING,
                     "w" : this.cont.offsetWidth - (CHART_PADDING * 2),
                     "h" : this.cont.offsetHeight - (CHART_PADDING * 2),
                     "maxX" : maxX,
                     "maxY" : maxY,
                     "startX" : firstDay
                   }
        this.line = new Line(quad, set, cmv);
        // draw title
        this.title.innerHTML = this.titleContent;
        this.title.setAttribute("x", quad.x + (quad.w / 2));
        this.title.setAttribute("y", quad.y);
        this.g.appendChild(this.title);
        // draw axes
        this.xAxis = document.createElementNS(svgns, "line");
        this.xAxis.setAttribute("x1", quad.x);
        this.xAxis.setAttribute("y1", quad.y + quad.h);
        this.xAxis.setAttribute("x2", quad.x + quad.w);
        this.xAxis.setAttribute("y2", quad.y + quad.h);
        this.xAxis.setAttribute("stroke", "#000000");
        this.g.appendChild(this.xAxis);
        this.yAxis = document.createElementNS(svgns, "line");
        this.yAxis.setAttribute("x1", quad.x);
        this.yAxis.setAttribute("y1", quad.y);
        this.yAxis.setAttribute("x2", quad.x);
        this.yAxis.setAttribute("y2", quad.y + quad.h);
        this.yAxis.setAttribute("stroke", "#000000");
        this.g.appendChild(this.yAxis);
    }

    clear() {
        this.line.clear();
    }
}

class Line {
    constructor(_quad, set, cmv) {
        this.quad = _quad;
        this.cmv = cmv;
        // should assert these are well-enough formed to visualize

        this.xStep = this.quad.w / this.quad.maxX;
        this.yStep = this.quad.h / this.quad.maxY;

        this.poly = document.createElementNS(svgns, "polyline");
        this.points = {};

        let path = ""
        Object.entries(set).map( (entry) => {
            let date = entry[0];
            let yValue = entry[1];
            let xValue = ISOdelta(date, this.quad.startX);

            let xCoord = xValue * this.xStep;
            let yCoord = yValue * this.yStep;

            path += (this.quad.x + xCoord) + "," + 
                    (this.quad.y + (this.quad.h - yCoord)) + " ";

            let newPoint = document.createElementNS(svgns, "circle");
            newPoint.setAttribute("cy", (this.quad.y + (this.quad.h - yCoord)));
            newPoint.setAttribute("cx", this.quad.x + xCoord);
            newPoint.setAttribute("r", LINE_POINT_SIZE);
            newPoint.setAttribute("fill", COLORS.lightBlue);
            this.quad.g.appendChild(newPoint);
            this.points[date] = newPoint;
            newPoint.onmouseover = () => this.cmv.highlightPoint(date);
            newPoint.onmouseout = () => this.cmv.dehighlightPoint(date);

        });
        this.poly.setAttribute("points", path);
        this.poly.setAttribute("fill", "none");
        this.poly.setAttribute("stroke", COLORS.lightBlue);
        this.poly.setAttribute("stroke-width", "1");
        this.quad.g.appendChild(this.poly);
    }

    highlighPoint(label) {
        points[label].setAttribute("fill", COLORS.yellow);
    }

    dehighlightPoint(label) {
        points[label].setAttribute("fill", COLORS.lightBlue);
    }

    clear() {
        this.quad.g.removeChild(this.poly);
        Object.values(this.points).map((p) => {
            this.quad.g.removeChild(p);
        });
    }
}

class BarChart {
    constructor(_cont, data, cmv) {
        this.cont = _cont;
        this.titleContent = data[0]
        this.data = data[1];
        this.cmv = cmv;
        this.svg = document.createElementNS(svgns, "svg");
        this.svg.setAttribute("width", this.cont.offsetWidth);
        this.svg.setAttribute("height", this.cont.offsetHeight);
        this.cont.appendChild(this.svg);
        this.g = document.createElementNS(svgns, "g");
        this.svg.appendChild(this.g);

        this.bars = [];
        this.title = document.createElementNS(svgns, "text");

        this.title.onclick = this.setViewOneUp;

    }

    setViewOneUp() {
        if (cmv.start == cmv.end) {
            if (cmv.start.length == 4) {
                cmv.drawAllYears();
            }
            if (cmv.start.length == 6) {
                cmv.drawYear(cmv.start.split("-")[0]);
            }
        }
    }

    setView(start, end=start) {
        if (start == end) {
            if (start.length == 4) {
                this.drawYear(start);
            } else {
                this.drawMonth(start);
            }
        } else {
            if (start.length == 4) {
                this.drawYears(start, end);
            } else {
                this.drawMonths(start, end);
            }
        }
    }

    highlightBar(label) {
        this.bars.find((el) => el.xLabelContent == label).highlight();
    }

    dehighlightBar(label) {
        this.bars.find((el) => el.xLabelContent == label).dehighlight();
    }

    drawAllYears() {
        this.draw(this.data.years);
    }

    drawYears(startYear, endYear) {
        let selectedData = {};
        Object.entries(this.data.years).map((e) => {
            let k = e[0];
            let v = e[1];
            if (k >= startYear && k <= endYear) {
                selectedData[k] = v;
            }
        });
        this.draw(selectedData);
    }
    
    drawYear(year) {
        this.drawMonths(year + "-01", year + "-12");
    }

    drawAllMonths() {
        this.draw(this.data.months);
    }

    drawMonths(ym1, ym2) {
        let startYear = ym1.split('-')[0];
        let startMonth = ym1.split('-')[1];
        let endYear = ym2.split('-')[0];
        let endMonth = ym2.split('-')[1];
        let selectedData = {};
        Object.entries(this.data.months).map((e) => {
            let k = e[0];
            let y = k.split('-')[0];
            let m = k.split('-')[1];
            let v = e[1];
            if ( (y >= startYear && y <= endYear) &&
                 (m >= startMonth && m <= endMonth)) {
                selectedData[k] = v;
            }
        });
        this.draw(selectedData);
    }
    
    drawMonth(month) {
        // don't implement this, shouldn't get here
    }
    
    clear() {
        this.bars.map((b) => b.clear());
    }
    
    draw(data) {
        this.clear();
        this.bars = [];
        let w = this.cont.offsetWidth - (CHART_PADDING * 2);
        let h = this.cont.offsetHeight - (CHART_PADDING * 2);
        let maxY = Math.max(...Object.values(data));
        let countX = Object.keys(data).length;
        let quad = { "g" : this.g,
                     "w" : w,
                     "h" : h,
                     "x" : CHART_PADDING,
                     "y" : CHART_PADDING,
                     "xStep" : w / countX,
                     "yStep" : h / maxY 
        }
        Object.entries(data).map( (entry, i) => {
            this.bars.push(new Bar(quad, entry, i, this.cmv));
        });
        // draw title
        this.title.innerHTML = this.titleContent;
        this.title.setAttribute("x", quad.x + (quad.w / 2));
        this.title.setAttribute("y", quad.y);
        this.g.appendChild(this.title);
        // draw axes
        this.xAxis = document.createElementNS(svgns, "line");
        this.xAxis.setAttribute("x1", quad.x);
        this.xAxis.setAttribute("y1", quad.y + quad.h);
        this.xAxis.setAttribute("x2", quad.x + quad.w);
        this.xAxis.setAttribute("y2", quad.y + quad.h);
        this.xAxis.setAttribute("stroke", "#000000");
        this.g.appendChild(this.xAxis);
        this.yAxis = document.createElementNS(svgns, "line");
        this.yAxis.setAttribute("x1", quad.x);
        this.yAxis.setAttribute("y1", quad.y);
        this.yAxis.setAttribute("x2", quad.x);
        this.yAxis.setAttribute("y2", quad.y + quad.h);
        this.yAxis.setAttribute("stroke", "#000000");
        this.g.appendChild(this.yAxis);
    }
}

class Bar {
    constructor(quad, data, i, cmv) {
        this.cmv = cmv;
        this.quad = quad;
        // should assert these are well-enough formed to visualize
        this.rect = document.createElementNS(svgns, "rect");

        this.xLabelContent = data[0];
        let yValue = data[1];

        let xCoord = quad.x + (i * quad.xStep);
        let yCoord = quad.y + (quad.h - (yValue * quad.yStep));

        // rect x, y are top left corner
        this.rect.setAttribute("x", xCoord);
        this.rect.setAttribute("y", yCoord);
        this.rect.setAttribute("width", quad.xStep * .75);
        this.rect.setAttribute("height", yValue * quad.yStep);
        this.rect.setAttribute("fill", COLORS.lightBlue);
        this.rect.onmouseover = () => this.cmv.highlightBar(this.xLabelContent);
        this.rect.onmouseout = () => this.cmv.dehighlightBar(this.xLabelContent);
        this.rect.onclick = () => this.cmv.setView(this.xLabelContent);

        quad.g.appendChild(this.rect);

        this.xLabel = document.createElementNS(svgns, "text");
        this.xLabel.innerHTML = this.xLabelContent;
        this.xLabel.setAttribute("x", xCoord);
        this.xLabel.setAttribute("y", quad.y + quad.h + (CHART_PADDING / 2));
        this.xLabel.setAttribute("opacity", 0);

        quad.g.appendChild(this.xLabel);

        this.yLabel = document.createElementNS(svgns, "text");
        this.yLabel.innerHTML = yValue.toFixed(2);
        this.yLabel.setAttribute("x", xCoord + quad.xStep / 2);
        this.yLabel.setAttribute("y", yCoord);
        this.yLabel.setAttribute("opacity", 0);

        quad.g.appendChild(this.yLabel);

    }

    highlight() {
        this.rect.setAttribute("fill", COLORS.yellow);
        this.xLabel.setAttribute("opacity", 1);
        this.yLabel.setAttribute("opacity", 1);
    }

    dehighlight() {
        this.rect.setAttribute("fill", COLORS.lightBlue);
        this.xLabel.setAttribute("opacity", 0);
        this.yLabel.setAttribute("opacity", 0);
    }

    clear() {
        this.quad.g.removeChild(this.rect);
        this.quad.g.removeChild(this.xLabel);
        this.quad.g.removeChild(this.yLabel);
        // walk through and remove children from parents up to g
    }
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
        console.log(pdata.yLabel + msString(pdata.y));
        console.log(pdata.zLabel + pdata.z);
        console.log(pdata.rLabel + pdata.r);
    }
}
