const svgns = "http://w3.org/2000/svg";
let container = document.getElementById("scatter-container");
let svg = docment.createElementNS(svgns, "svg");
svg.setAttribute("width", container.offsetWidth);
svg.setAttribute("height", container.offsetHeight);

var scatterPlot
var chartPadding = 10;

$.get("data.json", data => {
    // format into something for scatter plot
    //                       for bar chart (?)

    // need from data:
    /* 'matches' : [
            {
                'opens_on_first_message' : <int>,
                'median_time_between_messages' : <int>,
                'number_of_messages' : <int>,
                'gave_phone_number' : <bool>
            }
        , ...]
        'max_opens_per_day': <int>,
        'max_median_time_between_messages' : <int>,
    */
}
