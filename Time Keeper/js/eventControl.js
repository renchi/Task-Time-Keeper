/**
  * File containing event and flow control logic. 
  */

var addListeners = function() {
  /**
   * addListeners()
   * Add listeners for page events. 
   */
  addTabChangeListeners();
};

var addTabChangeListeners = function(){
  /**
   * addTabChangeListeners()
   * Add listeners to the tab buttons, enabling a user to switch between them.
   */
  var barChartButton = document.getElementById(BAR_CHART_BUTTON_ID);
  var pieChartButton = document.getElementById(PIE_CHART_BUTTON_ID);

  barChartButton.addEventListener('click', function() {
    showHiddenContent(ACTIVE_TAB, BAR_CHART_CONTENT_ID,
                      barChartButton, ACTIVE_BUTTON);
  });
  pieChartButton.addEventListener('click', function() {
    showHiddenContent(ACTIVE_TAB, PIE_CHART_CONTENT_ID,
                      pieChartButton, ACTIVE_BUTTON);
  });

  var displayStyle = 'block';
  currentButton = document.getElementById(BAR_CHART_BUTTON_ID);
  var toShow = document.getElementById(BAR_CHART_CONTENT_ID);
  toShow.style.display = displayStyle;
  currentButton.style.borderBottomColor = ACTIVE_BACKGROUND_COLOR;
  currentButton.style.backgroundColor = ACTIVE_BACKGROUND_COLOR;

};

var clearCurrentContents = function(targetNode) {
  /**
   * clearCurrentContents()
   * Clears the current contents of a provided node.
   * @param {element} targetNode A DOM node from which its children will be 
   *     cleared.
   */
  var node = document.getElementById(targetNode);
  if (node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }
};


var showHiddenContent = function(currentContent,
                                 targetContent,
                                 callingButton,
                                 currentButtonId) {
  /**
   * showHiddenContent()
   * Hides currently displayed content and shows another set of content.
   * @param {string} currentContent A string containing the ID of the content 
   *     currently displayed.
   * @param {string} targetContent A string containing the ID of the content 
   *     that should be displayed.
   * @param {element} callingButton A DOM element containing the object that was
   *     clicked and caused the event to fire.
   * @param {string} currentButtonId A string containing the id of the currently
   *     active button.
   */
  var displayStyle = 'block';
  currentButton = document.getElementById(ACTIVE_BUTTON);

  hideContent(currentContent, currentButton);

  var toShow = document.getElementById(targetContent);
  toShow.style.display = displayStyle;
  callingButton.style.borderBottomColor = ACTIVE_BACKGROUND_COLOR;
  callingButton.style.backgroundColor = ACTIVE_BACKGROUND_COLOR;

  // set up globals to track the state of the page
  ACTIVE_TAB = targetContent;
  // the id of the button that was clicked on is the new active button
  ACTIVE_BUTTON = event.target.id;
};

var hideContent = function(currentContent, currentButton) {
  /**
   * hideContent()
   * Hides a given content node, and updates its active button style.
   * @param {string} currentContent A string representing the ID of the current
   *     content displayed.
   * @param {element} currentButton A DOM element representing the currently
   *     active button.
   */
  var toHide = document.getElementById(currentContent);
  toHide.style.display = 'none';
  currentButton.style.borderBottomColor = BORDER_COLOR;
  currentButton.style.backgroundColor = DORMANT_BACKGROUND_COLOR;
};




var createBarChart = function(barChartData) {

  //Generate some nice data.
  function exampleData() {
    var data = [{
        "values" : [{
            "y" : 3,
            "x" : "04/05/2016"
        }, {
            "y" : 2.5,
            "x" : "04/11/2016"
        }, {
            "y" : 5,
            "x" : "04/12/2016"
        }, {
            "y" : 6,
            "x" : "04/13/2016"
        }, {
            "y" : 7,
            "x" : "04/14/2016"
        }],
        "key" : "Ramon"
    }, {
        "values" : [{
            "y" : 3,
            "x" : "04/05/2016"
        }, {
            "y" : 0,
            "x" : "04/11/2016"
        }, {
            "y" : 4.5,
            "x" : "04/12/2016"
        }, {
            "y" : 0,
            "x" : "04/13/2016"
          }, {
            "y" : 0,
            "x" : "04/14/2016"
        }],
        "key" : "Viper"
    }];
    return data;
  }

  //var data = barChartData;
  nv.addGraph(function() {
      var chart = nv.models.multiBarChart()
        //.transitionDuration(350)
        .reduceXTicks(true)   //If 'false', every single x-axis tick label will be rendered.
        .rotateLabels(0)      //Angle to rotate x-axis labels.
        .showControls(true)   //Allow user to switch between 'Grouped' and 'Stacked' mode.
        .groupSpacing(0.1)    //Distance between each group of bars.
      ;

      chart.xAxis.tickFormat(function(d) {
          return d3.time.format('%x')(new Date(d));
      });

      //chart.yAxis.tickFormat(d3.format(',d'));
      chart.yAxis.tickFormat(d3.format('.02f'));

      chart.multibar.stacked(true); // default to stacked
      //chart.showControls(false); // don't show controls

      d3.select('#bar-chart svg')
          .datum(exampleData())
          .call(chart);

      nv.utils.windowResize(chart.update);

      return chart;
  });
};

document.addEventListener('DOMContentLoaded', function () {
  /**
   * document.addEventListener()
   * Entry point into the code. Fires when the DOMContentLoaded event completes.
   */
  // add event listeners to elements
  addListeners();
  // begin querying the history API and setting up the page
  //buildHistoryItemList();
  createBarChart();



});

