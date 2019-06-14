const svgns = "http://w3.org/2000/svg";
let container = document.getElementById("scatter-container");
let svg = document.createElementNS(svgns, "svg");
svg.setAttribute("width", container.offsetWidth);
svg.setAttribute("height", container.offsetHeight);

var scatterPlot
var chartPadding = 10;

$.get("data.json", json => {
    // format into something for scatter plot
    //                       for bar chart (?)

    var data = parseData(json);
    console.log(data);
});

// utils
function median(arr) {
    const mid = Math.floor(arr.length / 2),
          nums = [...arr].sort((a, b) => a - b);
    return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

function parseData(data) {
    // need from data so far:

    /* 
    'matches' : [
         {
             'match_name' : <string>,
             'messages': [<Message>],
             'opens_on_first_message' : <int>,
             'median_time_between_messages' : <int>,
             'number_of_messages' : <int>,
             'gave_phone_number' : <bool>
         }
     , ...]
     'max_opens_per_day': <int>,
     'max_median_time_between_messages' : <int>,
    */

    // we'll probably need other things too
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
