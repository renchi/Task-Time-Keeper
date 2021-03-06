var db = openDatabase('tasktrack', '', 'Task track database', 2 * 1024 * 1024);

// id - unique autoincrement identificator of task
// project_name - project name or caption of the project
// name - name of taks or caption of task
// startTime - time task is started, timestamp in ms
// endTime - time task is ended, timestamp in ms
// duration - duration in ms
// running - task is in progress now

db.transaction(function (tx) {  
  tx.executeSql('CREATE TABLE IF NOT EXISTS timeInfo(ID INTEGER PRIMARY KEY ASC, project_name TEXT, name TEXT, startDate DATE, startTime INTEGER, endTime INTEGER, duration INTEGER, running BOOLEAN)', [], null, onError); // table creation
  tx.executeSql('CREATE TABLE IF NOT EXISTS breakInfo(ID INTEGER PRIMARY KEY ASC, breakTimeEnabled BOOLEAN, breakTimeStart TIME, breakTimeEnd TIME)', [], null, onError); // table creation
});

/**
 * Delete all records (drop table)
 */
function dropTaskTable() {
  db.transaction(function (tx) {
    tx.executeSql("DROP TABLE timeInfo", [], function (tx, results) {
      taskInterface.displayWarningAlert("DB error", "Table timeInfo was dropped.");
    }, onError);

     tx.executeSql("DROP TABLE breakInfo", [], function (tx, results) {
     taskInterface.displayWarningAlert("DB error", "Table breakInfo was dropped.");
    }, onError);   
  });
}

/**
 * Exception hook
 */
function onError(tx, error) {
  taskInterface.displayWarningAlert("DB error", error.message);
}

// Closure
(function() {

  /**
   * Decimal adjustment of a number.
   *
   * @param {String}  type  The type of adjustment.
   * @param {Number}  value The number.
   * @param {Integer} exp   The exponent (the 10 logarithm of the adjustment base).
   * @returns {Number} The adjusted value.
   */
  function decimalAdjust(type, value, exp) {
    // If the exp is undefined or zero...
    if (typeof exp === 'undefined' || +exp === 0) {
      return Math[type](value);
    }
    value = +value;
    exp = +exp;
    // If the value is not a number or the exp is not an integer...
    if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
      return NaN;
    }
    // Shift
    value = value.toString().split('e');
    value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
    // Shift back
    value = value.toString().split('e');
    return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
  }

  // Decimal round
  if (!Math.round10) {
    Math.round10 = function(value, exp) {
      return decimalAdjust('round', value, exp);
    };
  }
})();

var tasks = {

  insert: function (id, project_name, name) {
    db.transaction(function (tx) {
      var start = new Date().valueOf(); // set start to NOW
      var dateStarted = new moment().format("MM-DD-YYYY");

      tx.executeSql("INSERT INTO timeInfo (id, project_name, name, running, startDate, startTime) VALUES (?, ?, ?, ?, ?, ?)", [id, project_name, name, 1, dateStarted, start],
          function (tx, result) {
            taskInterface.index();
          },
          onError);
    });
  },

  remove: function (id) {
    db.transaction(function (tx) {
      tx.executeSql("DELETE FROM timeInfo WHERE id=?", [id],
          function (tx, result) {
            window.clearInterval(taskInterface.intervals[id]);
            taskInterface.index();
          },
          onError);
    });
  },

  removeentries: function () {
    var dpStartDate = new moment($("#deleteFrom").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
    var dpEndDate = new moment($("#deleteTo").datepicker( 'getDate' )).format('YYYY-MM-DD'); 

    db.transaction(function (tx) {
      tx.executeSql('DELETE FROM timeInfo WHERE startDate BETWEEN strftime("%m-%d-%Y", ?) AND strftime("%m-%d-%Y", ?)', [dpStartDate, dpEndDate], function (tx, results) {
        for (iid in taskInterface.intervals) {
          window.clearInterval(taskInterface.intervals[iid]);
        }

        taskInterface.index();
      }, onError);
    });
  }
}




/**
 * Time tracking user interface Javascript
 */
var taskInterface = {

  intervals: new Array,
  projSummaryRows: new Array,
  consolidatedProjSummary: new Array,
  dailySummaryRows: new Array,
  consolidatedDailySummary: new Array,
  dailyProjectSummary: new Array,
  dailyProjectSummaryCopy: new Array,

  bind: function () {

    /* activate scrollspy menu */
    $('body').scrollspy({
      target: '#navbar-collapsible',
      offset: 52
    });

    /* smooth scrolling sections */
    $('a[href*=#]:not([href=#])').click(function() {
        if (location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'') && location.hostname == this.hostname) {
          var target = $(this.hash);
          target = target.length ? target : $('[name=' + this.hash.slice(1) +']');
          if (target.length) {
            $('html,body').animate({
              scrollTop: target.offset().top - 50
            }, 800);
            
            if (this.hash=="#section1") {
                $('.scroll-up').hide();
            }
            else {
                $('.scroll-up').show();
            }
            
            
            // activte animations in this section
            target.find('.animate').delay(1200).addClass("animated");
            setTimeout(function(){
                target.find('.animated').removeClass("animated");
            },2000);
            
            return false;
          }
        }
    });

    $("#breakTime").bind( "click", function( event ) {
      taskInterface.handleBreakTime();
    });

    $("#deleteEntries").bind( "click", function( event ) {
      var currentTime = new Date();
      // First Date Of the month 
      var startDateFrom = new Date(currentTime.getFullYear(),currentTime.getMonth(),1);
      // Last Date Of the Month 
      var startDateTo = new Date(currentTime.getFullYear(),currentTime.getMonth() +1,0);

      $("#deleteFrom").datepicker({
        defaultDate: startDateFrom,
        changeMonth: true,
        changeYear: true
      }).datepicker("setDate", startDateFrom);

      $("#deleteTo").datepicker({
        defaultDate: startDateTo,
        changeMonth: true,
        changeYear: true
      }).datepicker("setDate", startDateTo);
    });

    $( "#removeEntries" ).bind( "click", function( event ) {
      event.preventDefault();
      tasks.removeentries();
      $('#deleteAllModal').modal('toggle');
    });

    $( "#removeEntry" ).bind( "click", function( event ) {
      event.preventDefault();
      tasks.remove($('#deleteTaskID').val());
      $('#removeModal').modal('toggle');
    });

    $( "#addEntry" ).bind( "click", function( event ) {
        var timeStarted = new Date();
        var momentStarted = new moment(timeStarted);
        $('#addTaskStart').val(momentStarted.format('YYYY-MM-DD HH:mm'));
        $('#addTaskEnd').val(momentStarted.format('YYYY-MM-DD HH:mm'));
        $('#addProjectName').val("");
        $('#addTaskName').val("");
    });

    // Methods in running the task timer
    $( "#play" ).bind( "click", function( event ) {
      taskInterface.playHandler();
    });
    $('#newTask').keydown(function ( event ) {
      taskInterface.timerToolbarKeyCodeHandler(event);
    });
    $('#newProject').keydown(function ( event ) {
      taskInterface.timerToolbarKeyCodeHandler(event);
    });


    // Methods in saving data entered in Manual Entry window
    $( "#AddSave" ).bind( "click", function( event ) {
      taskInterface.addSaveHandler(event);
    });
    $('#addProjectName').keydown(function ( event ) {
      if (event.keyCode == 13) {
        taskInterface.addSaveHandler(event);
      }
    });
    $('#addTaskName').keydown(function ( event ) {
      if (event.keyCode == 13) {
        taskInterface.addSaveHandler(event);
      }
    });
    $('#addTaskStart').keydown(function ( event ) {
      if (event.keyCode == 13) {
        taskInterface.addSaveHandler(event);
      }
    });
    $('#addTaskEnd').keydown(function ( event ) {
      if (event.keyCode == 13) {
        taskInterface.addSaveHandler(event);
      }
    });

    // Methods in saving edited item in Edit window
   $( "#UpdateSave" ).bind( "click", function( event ) {
      taskInterface.updateSaveHandler(event);
    });
    $('#editProjectName').keydown(function ( event ) {
      if (event.keyCode == 13) {
      taskInterface.updateSaveHandler(event);
      }
    });
    $('#editTaskName').keydown(function ( event ) {
      if (event.keyCode == 13) {
      taskInterface.updateSaveHandler(event);
      }
    });
    $('#editTaskStart').keydown(function ( event ) {
      if (event.keyCode == 13) {
      taskInterface.updateSaveHandler(event);
      }
    });
    $('#editTaskEnd').keydown(function ( event ) {
      if (event.keyCode == 13) {
      taskInterface.updateSaveHandler(event);
      }
    });

    // export all tasks
    $("#exportEntries").bind( "click", function( event ) {
      var currentTime = new Date();
      // First Date Of the month 
      var startDateFrom = new Date(currentTime.getFullYear(),currentTime.getMonth(),1);
      // Last Date Of the Month 
      var startDateTo = new Date(currentTime.getFullYear(),currentTime.getMonth() +1,0);

      $("#exportFrom").datepicker({
        defaultDate: startDateFrom,
        changeMonth: true,
        changeYear: true
      }).datepicker("setDate", startDateFrom);

      $("#exportTo").datepicker({
        defaultDate: startDateTo,
        changeMonth: true,
        changeYear: true
      }).datepicker("setDate", startDateTo);
    });

    // export all tasks
    $("#ExportOK").bind( "click", function( event ) {
      var dpStartDate = new moment($("#exportFrom").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
      var dpEndDate = new moment($("#exportTo").datepicker( 'getDate' )).format('YYYY-MM-DD'); 

      db.transaction(function (tx) {

        tx.executeSql('SELECT * FROM timeInfo WHERE startDate BETWEEN strftime("%m-%d-%Y", ?) AND strftime("%m-%d-%Y", ?) ORDER BY id DESC', [dpStartDate, dpEndDate], function (tx, results) {
          var out = '';
          var len = results.rows.length, i;

          if (len > 0) {
            for (i = 0; i < len; i++) {
              var timeInfo = results.rows.item(i);

              var startDateTime = new Date(timeInfo.startTime);
              var endDateTime = new Date(timeInfo.endTime);
              var roundedHours = Math.round10(moment.duration(timeInfo.duration).asHours(), -2);

              out += timeInfo.project_name  + ',' + 
                  timeInfo.name  + ',' + 
                  startDateTime.getFullYear() + '-' + (parseInt(startDateTime.getMonth()) + 1).toString() + '-' + startDateTime.getDate() + ',' + 
                  taskInterface.getHm(startDateTime) + ',' + 
                  endDateTime.getFullYear() + '-' + (parseInt(endDateTime.getMonth()) + 1).toString() + '-' + endDateTime.getDate()  + ',' + 
                  taskInterface.getHm(endDateTime)  + ',' + 
                  roundedHours +
                  '\n';
            }
          } else {
            out = "No tasks"
          }

          window.open('data:text/csv;charset=utf-8,' + encodeURIComponent(out));

        }, null);
      });
    });

    $(".summary").bind( "click", function( event ) {
      taskInterface.SummaryByProject();
    });

    $(".dailyDuration").bind( "click", function( event ) {
      taskInterface.dailySummary(false);
    });

    $("#dailyTable").bind( 'refresh-options.bs.table', function (options) {
        taskInterface.dailySummary(true);
    });
    $("#summaryTable").bind( 'refresh-options.bs.table', function (options) {
        if ( taskInterface.consolidatedProjSummary.length == 0 )
        {
          taskInterface.nextRecord(0,0);
        }
    });
    $("#table").bind( 'refresh-options.bs.table', function (options) {
        taskInterface.refreshTimeInfoData();
    });

   $( "#breakTimeSave" ).bind( "click", function( event ) {
      event.preventDefault();

      db.transaction(function (tx) {
        var bEnabled = $("#toggle-breaktime").prop('checked');
        var breakStarted = moment($('#breakTimeStart').val(), "hmm");
        var breakEnded = moment($('#breakTimeStop').val(), "hmm");
        tx.executeSql("UPDATE breakInfo SET breakTimeEnabled = ?, breakTimeStart = ?, breakTimeEnd = ? WHERE id = 1",
                       [bEnabled, breakStarted.format("HH:mm"), breakEnded.format("HH:mm")], null, onError);
      });

      $('#breakTimeModal').modal('toggle');
    });

  },

  getIdSelections: function ()  {
      return $.map($("#table").bootstrapTable('getSelections'), function (row) {
          return row.id
      });
  },

  SummaryByProject: function () {
    var dpStartDate = new moment($("#from").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
    var dpEndDate = new moment($("#to").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
    this.GetSummaryByProject(dpStartDate, dpEndDate);
  },

  GetSummaryByProject: function (dpStartDate, dpEndDate) {
    taskInterface.projSummaryRows = [];
    taskInterface.consolidatedProjSummary = [];

    db.transaction(function (tx) {
      tx.executeSql('SELECT project_name, SUM(duration) AS durationSum FROM timeInfo WHERE startDate BETWEEN strftime("%m-%d-%Y", ?) AND strftime("%m-%d-%Y", ?) GROUP BY project_name', [dpStartDate, dpEndDate], function (tx, results) {
        var len = results.rows.length, i;
        rows = [];
        var runningTotal = 0;
        if (len > 0) {
          for (i = 0; i < len; i++) {
            var task = results.rows.item(i);
            var roundedHours = Math.round10(moment.duration(task.durationSum).asHours(), -2);
            runningTotal = Math.round10(runningTotal + roundedHours, -2);

            var html = [];
            html.push('<a class="summary ml10" href="javascript:void(0)" title="Summary"><i class="glyphicon glyphicon-screenshot icon-primary"></i></a>');
            var taskData = "";
            taskData = html.join('');
            rows.push({
                projectName: task.project_name,
                duration:roundedHours,
                details: taskData
            });
            taskInterface.projSummaryRows.push({
                projectName: task.project_name,
                duration:roundedHours
            });
          } // fored
        } // if
        document.getElementById("ProjectTotal").innerHTML = "Total: "+ runningTotal + " hours";//
        $('#summaryTable').bootstrapTable('load', rows ); 
      }, null); // executesql
    }); //dbtransaction
  },

  nextRecord: function (tx, results) {
      if ( results != 0)
      {
        var len = results.rows.length;        
        if (len > 0) 
        {  
          var detailsData = "";
          for (var i = 0; i < len; i++) 
          {
            var task = results.rows.item(i);
            var roundedHours = Math.round10(moment.duration(task.durationSum).asHours(), -2);
            detailsData = detailsData + '<p>' + roundedHours + " H = " + task.name + "</p>";
          }

          taskInterface.consolidatedProjSummary.push({
              projectName: results.rows.item(0).project_name,
              duration:taskInterface.projSummaryRows[0].duration,
              details: detailsData
          });
          taskInterface.projSummaryRows.shift();
          $('.icon-plus').css('color','green');
        } // if
      }

      if (taskInterface.projSummaryRows.length > 0) 
      {
        db.transaction(function (tx) {
          var dpStartDate = new moment($("#from").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
          var dpEndDate = new moment($("#to").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
          var row = taskInterface.projSummaryRows[0];
          tx.executeSql('SELECT DISTINCT NAME, project_name, SUM(duration) AS durationSum  FROM timeInfo WHERE project_name = ? AND startDate BETWEEN strftime("%m-%d-%Y", ?) AND strftime("%m-%d-%Y", ?) GROUP BY name', 
            [row.projectName, dpStartDate, dpEndDate], taskInterface.nextRecord, null); 
        }); //dbtransaction            
      } 
      else
      {
        $('#summaryTable').bootstrapTable('load', taskInterface.consolidatedProjSummary );
      }
  }, 

  nextDailyRecord: function (tx, results) {
      if ( results != 0)
      {
        var len = results.rows.length;        
        if (len > 0) 
        {  
          var detailsData = "";
          for (var i = 0; i < len; i++) 
          {
            var task = results.rows.item(i);
            var roundedHours = Math.round10(moment.duration(task.durationSum).asHours(), -2);
            //detailsData = detailsData + task.name + " = " + roundedHours + " H";
            detailsData = detailsData + '<p align="center">' + roundedHours + " H = &nbsp" + task.project_name + " :&nbsp " + task.name  + "</p>";
          }

          taskInterface.consolidatedDailySummary.push({
              taskDate: results.rows.item(0).startDate,
              details: detailsData
          });
          taskInterface.dailyProjectSummaryCopy.shift();
          $('.icon-plus').css('color','green');
        } // if
      }

      if (taskInterface.dailyProjectSummaryCopy.length > 0) 
      {
        db.transaction(function (tx) {
          var row = taskInterface.dailyProjectSummaryCopy[0];
          tx.executeSql('SELECT DISTINCT project_name, name, startDate, SUM(duration) AS durationSum FROM timeInfo WHERE startDate = ? GROUP BY name', 
            [row.taskDate], taskInterface.nextDailyRecord, null); 
        }); //dbtransaction            
      } 
  }, 

  nextDailyRecordWithProj: function (tx, results) {
      if ( results != 0)
      {
        var len = results.rows.length;        
        if (len > 0) 
        {  
          var detailsData = "";
          for (var i = 0; i < len; i++) 
          {
            var task = results.rows.item(i);
            var roundedHours = Math.round10(moment.duration(task.durationSum).asHours(), -2);
            detailsData = detailsData + '<p>' + roundedHours + " H = " + task.project_name + "</p>";
          }

          taskInterface.dailyProjectSummary.push({
              taskDate: results.rows.item(0).startDate,
              duration: taskInterface.dailySummaryRows[0].duration,
              details: detailsData
          });
          
          taskInterface.dailyProjectSummaryCopy.push({
              taskDate: results.rows.item(0).startDate,
              duration: taskInterface.dailySummaryRows[0].duration,
              details: detailsData
          });
          taskInterface.dailySummaryRows.shift();
          $('.icon-plus').css('color','green');
        } // if
      }

      if (taskInterface.dailySummaryRows.length > 0) 
      {
        db.transaction(function (tx) {
          var row = taskInterface.dailySummaryRows[0];
          tx.executeSql('SELECT DISTINCT project_name, name, startDate, SUM(duration) AS durationSum FROM timeInfo WHERE startDate = ? GROUP BY project_name', 
            [row.taskDate], taskInterface.nextDailyRecordWithProj, null); 
        }); //dbtransaction            
      } 
      else
      {
        $('#dailyTable').bootstrapTable('load', taskInterface.dailyProjectSummary );
        taskInterface.nextDailyRecord(0,0);
      }
  }, 

  dailySummary: function (bRefresh) {
    var dpStartDate = new moment($("#fromDaily").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
    var dpEndDate = new moment($("#toDaily").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
    this.GetDailySummary(dpStartDate, dpEndDate, bRefresh);
  },

  GetDailySummary: function (dpStartDate, dpEndDate, bRefresh) {
    taskInterface.dailySummaryRows = [];
    taskInterface.consolidatedDailySummary = [];
    taskInterface.dailyProjectSummary = [];
    taskInterface.dailyProjectSummaryCopy = [];
    db.transaction(function (tx) {
      tx.executeSql('SELECT startDate, SUM(duration) AS durationSum FROM timeInfo WHERE startDate BETWEEN strftime("%m-%d-%Y", ?) AND strftime("%m-%d-%Y", ?) GROUP BY startDate ORDER BY startDate DESC', [dpStartDate, dpEndDate], function (tx, results) {
        $('#dailyTable').bootstrapTable('removeAll');
        var len = results.rows.length, i;
        rows = [];
        if (len > 0) {
          for (i = 0; i < len; i++) {
            var task = results.rows.item(i);

            var html = [];
            html.push('<a class="dailyDetails ml10" href="javascript:void(0)" title="Daily Details"><i class="glyphicon glyphicon-screenshot icon-success"></i></a>');
            var taskData = "";
            taskData = html.join('');

            taskInterface.dailySummaryRows.push({
                taskDate: task.startDate,
                duration: Math.round10(moment.duration(task.durationSum).asHours(), -2),
                details: taskData
            });
          } // for
        } // if
        $('#dailyTable').bootstrapTable('load', taskInterface.dailySummaryRows );
        if (bRefresh == true){
          taskInterface.nextDailyRecordWithProj(0,0); 
        }
      }, null); // executesql
    }); //dbtransaction
  },

  displayTimeInfoData: function (results) {
    rows = [];
    var len = results.rows.length, i;

    if (len > 0) {
      for (i = 0; i < len; i++) {
        var task = results.rows.item(i);
        var startDateTime = new moment(new Date(task.startTime));
        var endDateTime = new moment(new Date(task.endTime));

        var endTimeDisplay = "";
        var durationDisplay;
        var start = new Date(task.startTime);
        if (task.running == true) {
          taskInterface.startTask(task); // start task

          $('#play').html('<span class="glyphicon glyphicon-play-circle icon-danger icon-main-size rel="' + task.ID + '"></span>');
          $('#newTask').val(task.name);
          $('#newProject').val(task.project_name);

        } else {
          endTimeDisplay = taskInterface.getHm(new Date(task.endTime));
          durationDisplay = moment.duration(task.duration).hours() + ":" ;
          var minsPart = moment.duration(task.duration).minutes();
          if (minsPart < 10 ){
            durationDisplay = durationDisplay + "0" + minsPart;
          }
          else{
            durationDisplay = durationDisplay + minsPart;
          }
          
          rows.push({
              id: task.ID,
              taskName: task.name,
              projectName: task.project_name,
              date: startDateTime.format("MMM D"),
              startStopTime: taskInterface.getHm(new Date(task.startTime)) + " - " + endTimeDisplay,
              duration: durationDisplay,
              running: task.running
          });
        }
      } // for
    } // if
    $('#table').bootstrapTable('load', rows );
  },   

  timeInfoData: function () {
    $('#play').html('<span class="glyphicon glyphicon-play-circle icon-success icon-main-size"></span>');

    db.transaction(function (tx) {
      var dpMonthAgo = new moment().subtract(31, 'days').format('YYYY-MM-DD');
      var dpToday = new moment().format('YYYY-MM-DD'); 
      tx.executeSql('SELECT * FROM timeInfo WHERE startDate BETWEEN strftime("%m-%d-%Y", ?) AND strftime("%m-%d-%Y", ?) ORDER BY startTime DESC', [dpMonthAgo, dpToday], function (tx, results) {
        taskInterface.displayTimeInfoData(results);
      }, null); // executesql
    }); //dbtransaction
  },

  refreshTimeInfoData: function () {
    $('#play').html('<span class="glyphicon glyphicon-play-circle icon-success icon-main-size"></span>');

    db.transaction(function (tx) {
      tx.executeSql('SELECT * FROM timeInfo ORDER BY startTime DESC', [], function (tx, results) {
        taskInterface.displayTimeInfoData(results);
      }, null); // executesql
    }); //dbtransaction
  },

  index: function () {
    this.timeInfoData();
    this.SummaryByProject();
    this.dailySummary(false);
    displayBarChart();
    this.toggleRunText();
  },

  init: function () {
    this.bind();
    this.index();
    this.toggleRunText();
  },

  toggleTimer: function (id) {
    db.transaction(function (tx) {
      tx.executeSql('SELECT * FROM timeInfo WHERE ID = ?', [id], function (tx, results) {
        if (results.rows.length > 0) {
          var task = results.rows.item(0);
          if (task.running == true) {
            taskInterface.stopTask(task);
          } else {
            taskInterface.stopRunningTask();
            taskInterface.startTask(task);
          }

        } else {
          taskInterface.displayWarningAlert("Time Info", "Task " + id + " not found sorry!");
        }
      }, null);
    });
  },


  addSaveHandler: function ( event ) {
    var fTask = $('#addTaskName').val();
    var fProj = $('#addProjectName').val();

    if (fTask == null || fTask == "" || fProj == null || fProj == "") {
        taskInterface.displayWarningAlert("Manual entry", "Task and project names must be filled out.");
        return false;
    }

    event.preventDefault();

    db.transaction(function (tx) {
      var id = taskInterface.nextID(); // get id
      var project_name = $('#addProjectName').val(); // get name
      var name = $('#addTaskName').val(); // get name

      var dataToSet1 = $('#addTaskStart').val();
      var momentStarted = new moment(dataToSet1);
      var timeStarted = momentStarted.valueOf(); // get task time

      var dataToSet2 = $('#addTaskEnd').val();
      var momentEnded = new moment(dataToSet2);
      var timeEnded = momentEnded.valueOf(); // get task time

      var newDuration = timeEnded - timeStarted; // time diff in milliseconds
      var dateStarted = momentStarted.format("MM-DD-YYYY"); // get task time

      taskInterface.handleNewEntry(id, dateStarted, timeStarted, timeEnded, project_name, name, true);
    });

    $('#myModal').modal('toggle');
  },

  updateSaveHandler: function ( event ) {
    event.preventDefault();

    var id = $('#editTaskID').val(); // get id
    var project_name = $('#editProjectName').val(); // get name
    var name = $('#editTaskName').val(); // get name

    var dataToSet1 = $('#editTaskStart').val();
    var momentStarted = new moment(dataToSet1);
    var timeStarted = momentStarted.valueOf(); // get task time

    var dataToSet2 = $('#editTaskEnd').val();
    var momentEnded = new moment(dataToSet2);
    var timeEnded = momentEnded.valueOf(); // get task time

    var newDuration = timeEnded - timeStarted; // time diff in milliseconds
    var dateStarted = momentStarted.format("MM-DD-YYYY"); // get task time

    db.transaction(function (tx) {
      tx.executeSql("UPDATE timeInfo SET project_name = ?, name = ?, startDate = ?, startTime = ?, endTime = ?, duration = ? WHERE id = ?",
                     [project_name, name, dateStarted, timeStarted, timeEnded, newDuration, id], function (tx, results) {
        taskInterface.index();
      }, onError);
    });

    $('#updateModal').modal('toggle');
  },

  playHandler: function () {
    var fTask = $('#newTask').val();
    var fProj = $('#newProject').val();

    if (fTask == null || fTask == "" || fProj == null || fProj == "") {
        taskInterface.displayWarningAlert("New entry", "Task and project names must be filled out.");
        return false;
    }

    db.transaction(function (tx) {
      tx.executeSql('SELECT * FROM timeInfo WHERE running = ?', [1], function (tx, results) {
        if (results.rows.length > 0) {
          taskInterface.toggleTimer(results.rows.item(0).ID);
        }
        else{
          tasks.insert(taskInterface.nextID(), $('#newProject').val(), $('#newTask').val() );
        }
      }, null, onError);
    });
  },

  timerToolbarKeyCodeHandler: function (event) {
    if (event.keyCode == 13) {
      db.transaction(function (tx) {
        tx.executeSql('SELECT * FROM timeInfo WHERE running = ?', [1], function (tx, results) {
          if (results.rows.length > 0) {
            var task = results.rows.item(0);
            db.transaction(function (tx) {
              var projName = $('#newProject').val();
              var name = $('#newTask').val();
              tx.executeSql("UPDATE timeInfo SET project_name = ?, name = ? WHERE id = ?",
                              [projName, name, task.ID], function (tx, results) {
                 taskInterface.index();
               }, onError);
            });
          }
          else
          {
            taskInterface.playHandler(); 
          }
        }, null, onError);
      });
    }
  },

  handleBreakTime: function () {
    $('#breakTimeWarning').text("");
    /* Initialize the table */
    db.transaction(function (tx) {
      tx.executeSql('SELECT * FROM breakInfo', null, function (tx, results) {
        var len = results.rows.length, i;
        if (len > 0) 
        {
          var breakTimeInfo = results.rows.item(i);
          if ( breakTimeInfo.breakTimeEnabled == true || breakTimeInfo.breakTimeEnabled == 'true')
          {
            $('#toggle-breaktime').bootstrapToggle('on'); 
          }
          else
          {
            $('#toggle-breaktime').bootstrapToggle('off'); 
          }
          taskInterface.updateBreakTimeInputTexts($('#breakTimeStart'), breakTimeInfo.breakTimeStart);
          taskInterface.updateBreakTimeInputTexts($('#breakTimeStop'), breakTimeInfo.breakTimeEnd);
        } 
        else 
        {
          db.transaction(function (tx) {
              tx.executeSql("INSERT INTO breakInfo (ID, breakTimeEnabled, breakTimeStart, breakTimeEnd) VALUES (?, ?, ?, ?)",
                 [1, false, "12:00", "13:00"], function (tx, results) {
                  taskInterface.updateBreakTimeInputTexts($('#breakTimeStart'), "12:00");
                  taskInterface.updateBreakTimeInputTexts($('#breakTimeStop'), "13:00");   
                  $('#toggle-breaktime').bootstrapToggle('off');                   
                 }, null); // executesql
          }); //dbtransaction
        }

      }, null); // executesql
    }); //dbtransaction
 },


  updateBreakTimeInputTexts: function (inputClock, value) {
    var input = inputClock.clockpicker({
        placement: 'bottom',
        align: 'left',
        default: value,
        autoclose: true,
        afterDone: function() 
        {
          var breakStarted = moment($('#breakTimeStart').val(), "hmm");
          var breakEnded = moment($('#breakTimeStop').val(), "hmm");
          if (moment(breakEnded).isAfter(breakStarted))
          {
            $('#breakTimeWarning').text("");
          }
          else
          {
            $('#breakTimeWarning').text("Invalid break time setting.  End time should be after start time.");
          }
        }
    });
    inputClock.val(value);
  },

  //////////////////////////////////////////////////////////////////////////////
  // start task
  //////////////////////////////////////////////////////////////////////////////

  startTask: function (task) {
    for (iid in taskInterface.intervals) {
      window.clearInterval(taskInterface.intervals[iid]);
    }

    var start = new Date().valueOf(); // set start to NOW
    var idToRun = task.ID;
    if (task.running == true) {
      start = new Date(task.startTime);
    } else {
      idToRun = taskInterface.nextID();
      tasks.insert(idToRun, task.project_name , task.name);
    }

    // setup interval for counter
    taskInterface.intervals[idToRun] = window.setInterval(function () {
      var dif = Math.floor((new Date().getTime() - start.getTime()) / 1000)
       $('#timer').text(taskInterface.hms(dif));
    }, 500);

  },

  //////////////////////////////////////////////////////////////////////////////
  // stop task
  //////////////////////////////////////////////////////////////////////////////

  stopTask: function (task) {
    for (iid in taskInterface.intervals) {
      window.clearInterval(taskInterface.intervals[iid]);
    }
    db.transaction(function (tx) {
      tx.executeSql('SELECT * FROM timeInfo WHERE id = ?', [task.ID], function (tx, results) {
        if (results.rows.length > 0) 
        {
          var startDate = results.rows.item(0).startDate;
          var start = results.rows.item(0).startTime; // read from DB
          var stop = new Date().valueOf(); // now
          var projName = $('#newProject').val();
          var name = $('#newTask').val();

          taskInterface.handleNewEntry(task.ID, startDate, start, stop, projName, name, false);
          $('#timer').text("0 sec");
          $('#newTask').val('').focus();
          $('#newProject').val('');
        } else {
          taskInterface.displayWarningAlert("", "Task " + task.ID + " not found!" );
        }
      }, null, onError);
    });
  },

  handleNewEntry: function (id, startDate, start, stop, projName, name, bNewEntry) {
    var bBreakTimeEnabled = false;
    var dif, dif2 = 0;
    var breakStarted, breakEnded = 0;
    var split1StartTime, split1EndTime, split2StartTime, split2EndTime = 0;

    db.transaction(function (tx) {
      tx.executeSql('SELECT * FROM breakInfo WHERE id = 1', null, function (tx, results) {
        var len = results.rows.length, i;
        if (len > 0) 
        {
          var breakTimeInfo = results.rows.item(i);
          if ( breakTimeInfo.breakTimeEnabled == true || breakTimeInfo.breakTimeEnabled == 'true')
          {
            bBreakTimeEnabled = true;
          }
          breakStarted = moment(breakTimeInfo.breakTimeStart, "HH:mm");
          breakEnded = moment(breakTimeInfo.breakTimeEnd, "HH:mm");
        } 

        var bDataValid = true;
        split1StartTime =  start;
        split1EndTime = stop;
        dif = stop - start; // time diff in milliseconds

        if ( bBreakTimeEnabled == true ){
          var momentStarted = new moment(start);//.format("HH:mm");
          var momentStopped = new moment(stop);//.format("HH:mm");

          var myYear = moment(startDate).year();
          var myMonth = moment(startDate).month();
          var myDate = moment(startDate).date();
          var myHour, myMin = 0;
          if ( moment(momentStarted).isBetween(breakStarted, breakEnded) &&
               moment(momentStopped).isBetween(breakStarted, breakEnded) && 
               momentStarted.date() == momentStopped.date() )
          {
            taskInterface.displayWarningAlert("Break time setting", "Task start and stop time are within break time period.");
            bDataValid = false;
          }
          else if ( moment(momentStarted).isBefore(breakStarted) &&
                 moment(momentStopped).isAfter(breakEnded) &&
                 momentStarted.date() == momentStopped.date())
          {
              var myHour = moment(breakStarted).hours();
              var myMin = moment(breakStarted).minutes();
              split1EndTime = moment({ y:myYear, M:myMonth, d:myDate, h:myHour, m:myMin}).valueOf();
              split1StartTime = momentStarted.valueOf();
              dif = split1EndTime - split1StartTime;

              myHour = moment(breakEnded).hours();
              myMin = moment(breakEnded).minutes();
              split2StartTime = moment({ y:myYear, M:myMonth, d:myDate, h:myHour, m:myMin}).valueOf();
              split2EndTime = momentStopped.valueOf();
              dif2 = split2EndTime - split2StartTime;
          }
          else if ( moment(momentStarted).isBetween(breakStarted, breakEnded) )
          {
              var myHour = moment(breakEnded).hours();
              var myMin = moment(breakEnded).minutes();
              split1StartTime = moment({ y:myYear, M:myMonth, d:myDate, h:myHour, m:myMin}).valueOf();
              split1EndTime = momentStopped.valueOf();
              dif = split1EndTime - split1StartTime;
              taskInterface.displayInfoAlert("New entry", "Start time was adjusted as it was within break period.");
          }
          else if ( moment(momentStopped).isBetween(breakStarted, breakEnded) &&
                    momentStarted.date() == momentStopped.date() )
          {
              var myHour = moment(breakStarted).hours();
              var myMin = moment(breakStarted).minutes();
              split1EndTime = moment({ y:myYear, M:myMonth, d:myDate, h:myHour, m:myMin}).valueOf();
              split1StartTime = momentStarted.valueOf();
              dif = split1EndTime - split1StartTime;
              taskInterface.displayInfoAlert("New entry", "End time was adjusted as it was within break period.");
          }
        }

        if (bDataValid)
        {
          // update record
          db.transaction(function (tx) {
            var firstSqlString;
            var firstSqlParam = [];
            if (bNewEntry){
              firstSqlString = "INSERT INTO timeInfo (id, project_name, name, running, startDate, startTime, endTime, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
              firstSqlParam = [id, projName, name, 0, startDate, split1StartTime, split1EndTime, dif];
            }
            else{
              firstSqlString = "UPDATE timeInfo SET project_name = ?, name = ?, running = ?, startTime = ?, endTime = ?, duration = ? WHERE id = ?";
              firstSqlParam = [projName, name, 0, split1StartTime, split1EndTime, dif, id];
            }
            tx.executeSql(firstSqlString, firstSqlParam, function (tx, results) {
                if (split2StartTime != 0 && split2EndTime != 0)
                {
                    db.transaction(function (tx) {
                      tx.executeSql("INSERT INTO timeInfo (id, project_name, name, running, startDate, startTime, endTime, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", 
                        [taskInterface.nextID(), projName, name, 0, startDate, split2StartTime, split2EndTime, dif2], function (tx, results) {
                        taskInterface.index();
                        taskInterface.displayInfoAlert("New entry", "Tasks were split as it covers break period.");
                      }, onError); 
                    });
                }
                else
                {
                  taskInterface.index();
                }
            }, onError);
          });
        }

      }, null); // executesql
    }); //dbtransaction

  },

  //////////////////////////////////////////////////////////////////////////////
  // stop any running task
  //////////////////////////////////////////////////////////////////////////////

  stopRunningTask: function () {
    // stop any running task
    db.transaction(function (tx) {
      tx.executeSql('SELECT * FROM timeInfo WHERE running = ?', [1], function (tx, results) {
        if (results.rows.length > 0) {
          taskInterface.stopTask(results.rows.item(0) );
        } 
      }, null, onError);
    });

  },



  //////////////////////////////////////////////////////////////////////////////
  // toggle RUN text on icon
  //////////////////////////////////////////////////////////////////////////////

  toggleRunText: function () {
    db.transaction(function (tx) {
      tx.executeSql('SELECT * FROM timeInfo WHERE running = ?', [1], function (tx, results) {
        if (results.rows.length > 0) {
          chrome.browserAction.setBadgeText({
            text: 'ON'
          });
          chrome.browserAction.setBadgeBackgroundColor({color:[0, 200, 0, 100]});

        } else {
          chrome.browserAction.setBadgeText({
            text: ''
          });
        }
      }, null, onError);
    });
  },

  //////////////////////////////////////////////////////////////////////////////
  // convert sec to hms
  //////////////////////////////////////////////////////////////////////////////

  hms: function (secs) {
    //secs = secs % 86400; // fix 24:00:00 overlay
    var time = [0, 0, secs], i;
    for (i = 2; i > 0; i--) {
      time[i - 1] = Math.floor(time[i] / 60);
      time[i] = time[i] % 60;
      if (time[i] < 10) {
        time[i] = '0' + time[i];
      }
    }
    return time.join(':');
  },

  getHm: function (dateInfo) {
    var date = dateInfo;
    // hours part from the timestamp
    var hours = date.getHours();
    // minutes part from the timestamp
    var minutes = "0" + date.getMinutes();

    // will display time in 10:30:23 format
    var formattedTime = hours + ':' + minutes.substr(-2);
    return formattedTime;
  },

  //////////////////////////////////////////////////////////////////////////////
  // convert h:m:s to sec
  //////////////////////////////////////////////////////////////////////////////

  sec: function (hms) {
    var t = String(hms).split(":");
    return Number(parseFloat(t[0] * 3600) + parseFloat(t[1]) * 60 + parseFloat(t[2]));
  },

  nextID: function () {
    var id = localStorage['lastid']; // get last id from local storage
    if (id == undefined) {
      id = 1; // generate first ID
    } else {
      id++; // generate next ID
    }
    localStorage['lastid'] = id; // save to localStorage
    return id;
  },

  displayWarningAlert: function (modalTitle, message) {
    //$('#warningModalTitle').text(modalTitle);
    $('#warningModalLabel').text(message);
    $('#warningModal').modal('toggle');

    setTimeout(function(){
        $("#warningModal").modal('toggle');
    }, 2500);
  },

  displayInfoAlert: function (modalTitle, message) {
    //$('#warningModalTitle').text(modalTitle);
    $('#infoModalLabel').text(message);
    $('#infoModal').modal('toggle');

    setTimeout(function(){
        $("#infoModal").modal('toggle');
    }, 3000);
  }

};

function detailFormatter(index, row) {
    var html = [];
    var arrayLength = taskInterface.consolidatedDailySummary.length;
    if (arrayLength > 0 ){
      var ent = taskInterface.consolidatedDailySummary.entries();
      for (var i = 0; i < arrayLength; i++) {
          if (row.taskDate == taskInterface.consolidatedDailySummary[i].taskDate){
            html.push(taskInterface.consolidatedDailySummary[i].details);        
          }
      }
    }else{
      html.push('<p>Click &nbsp' + '<span class="glyphicon glyphicon-refresh"></span>' + ' button to get details.</p>');
    }
    return html.join('');
}

function operateFormatter(value, row, index) {
  return [
      '<a class="remove ml10" href="javascript:void(0)" title="Remove">',
          '<i class="glyphicon glyphicon-remove icon-danger" data-toggle="modal" data-target="#removeModal"></i>',
      '</a>',
      '<a class="edit ml10" href="javascript:void(0)" title="Edit">',
          '<i class="glyphicon glyphicon-pencil icon-info" data-toggle="modal" data-target="#updateModal"></i>',
      '</a>',
      '<a class="play" href="javascript:void(0)" title="Play">',
          '<i class="glyphicon glyphicon-play icon-success"></i>',
      '</a>'
  ].join('');
}

window.operateEvents = {
  'click .play': function (e, value, row, index) {
      taskInterface.toggleTimer(row.id);
  },
  'click .edit': function (e, value, row, index) {
      db.transaction(function (tx) {
        tx.executeSql('SELECT * FROM timeInfo WHERE ID = ?', [row.id], function (tx, results) {

          if (results.rows.length > 0) {
            $('#editTaskID').val(results.rows.item(0).ID);
            $('#editTaskName').val(results.rows.item(0).name);
            $('#editProjectName').val(results.rows.item(0).project_name);

            var timeStarted = new Date(results.rows.item(0).startTime);
            var momentStarted = new moment(timeStarted);
            $('#editTaskStart').val(momentStarted.format('YYYY-MM-DD HH:mm'));
            var timeEnded = new Date(results.rows.item(0).endTime);
            var momentEnded = new moment(timeEnded);
            $('#editTaskEnd').val(momentEnded.format('YYYY-MM-DD HH:mm'));
          } else {
            taskInterface.displayWarningAlert("", "Task " + id + " not found!" );
          }
        }, null);
      });
  },
  'click .remove': function (e, value, row, index) {
      db.transaction(function (tx) {
        tx.executeSql('SELECT * FROM timeInfo WHERE ID = ?', [row.id], function (tx, results) {

          if (results.rows.length > 0) {
            $('#deleteTaskID').val(results.rows.item(0).ID);
            $('#deleteTaskName').text(results.rows.item(0).name);
            $('#deleteProjectName').text(results.rows.item(0).project_name);

            var timeStarted = new Date(results.rows.item(0).startTime);
            var momentStarted = new moment(timeStarted);
            $('#deleteTaskStart').text(momentStarted.format('YYYY-MM-DD HH:mm'));
            var timeEnded = new Date(results.rows.item(0).endTime);
            var momentEnded = new moment(timeEnded);
            $('#deleteTaskEnd').text(momentEnded.format('YYYY-MM-DD HH:mm'));
          } else {
            taskInterface.displayWarningAlert("", "Task " + id + " not found!" );
          }
        }, null);
      });
  },
  'click .summary': function (e, value, row, index) {
    db.transaction(function (tx) {
      var dpStartDate = new moment($("#from").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
      var dpEndDate = new moment($("#to").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
      tx.executeSql('SELECT DISTINCT NAME, project_name, SUM(duration) AS durationSum  FROM timeInfo WHERE project_name = ? AND startDate BETWEEN strftime("%m-%d-%Y", ?) AND strftime("%m-%d-%Y", ?) GROUP BY name', 
        [row.projectName, dpStartDate, dpEndDate], function (tx, results) {
          if (results.rows.length > 0) 
          {
            var len = results.rows.length;        
            if (len > 0) 
            {  
              var detailsData = "";
              for (var i = 0; i < len; i++) 
              {
                var task = results.rows.item(i);
                var roundedHours = Math.round10(moment.duration(task.durationSum).asHours(), -2);
                detailsData = detailsData + '<p align="center">' + roundedHours + " H = " + task.name + "</p>";
              }
            }
            var myProjSummary = {
            projectName: row.projectName,
            duration:row.duration,
            details: detailsData};
            $("#summaryTable").bootstrapTable('updateRow', {index: index, row: myProjSummary});
          } 
        }, null); 
    }); //dbtransaction   
  },
  'click .dailyDetails': function (e, value, row, index) {
    db.transaction(function (tx) {
      tx.executeSql('SELECT DISTINCT project_name, name, startDate, SUM(duration) AS durationSum FROM timeInfo WHERE startDate = ? GROUP BY project_name', 
        [row.taskDate], function (tx, results) {
          var len = results.rows.length;   
          if (len > 0) 
          {
            var detailsData = "";
            for (var i = 0; i < len; i++) 
            {
              var task = results.rows.item(i);
              var roundedHours = Math.round10(moment.duration(task.durationSum).asHours(), -2);
              detailsData = detailsData + '<p align="center">' + roundedHours + " H = " + task.project_name + "</p>";
            } 

            var myDailySummary = {
            taskDate: row.taskDate,
            duration:row.duration,
            details: detailsData};
            $("#dailyTable").bootstrapTable('updateRow', {index: index, row: myDailySummary});
          } 
        }, null); 
    }); //dbtransaction   
  }
};



/**
 * Chart user interface Javascript
 */
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

  if (currentButtonId == BAR_CHART_BUTTON_ID)
  {
    displayPieChart();
  }
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

var displayBarChart = function() {
 chartProjects: new Array;
 chartProjects = [];
 getBarChartProjData();
};

var displayPieChart = function() {
  db.transaction(function (tx) {
    pieChartProjectData: new Array;
    pieChartProjectData = [];
    var dpStartDate = new moment($("#fromChart").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
    var dpEndDate = new moment($("#toChart").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
    tx.executeSql('SELECT project_name, SUM(duration) AS durationSum FROM timeInfo WHERE startDate BETWEEN strftime("%m-%d-%Y", ?) AND strftime("%m-%d-%Y", ?) GROUP BY project_name', [dpStartDate, dpEndDate], function (tx, results) {
      var len = results.rows.length, i;
      if (len > 0) {
        for (i = 0; i < len; i++) {
          var task = results.rows.item(i);
          var roundedHours = Math.round10(moment.duration(task.durationSum).asHours(), -2);
          pieChartProjectData.push({label:task.project_name,value:roundedHours});
        } // fored
      } // if
      createPieChart();
    }, null); // executesql
  }); //dbtransaction

};

var nextProjDailyTime = function (tx, results) {
  if ( results != 0)
  {
    var len = results.rows.length;        
    if (len > 0) 
    { 
      var valuesArray = [];
      for (var i = 0; i < len; i++) 
      {
        var task = results.rows.item(i);
        var roundedHours = Math.round10(moment.duration(task.durationSum).asHours(), -2);
        valuesArray.push({x:task.startDate,y:roundedHours});
      }
      var projName = results.rows.item(0).project_name;
      dailyChartData.push({values:valuesArray,key:projName});
      chartProjects.shift();
    } // if
  }

  if (chartProjects.length > 0) 
  {
    db.transaction(function (tx) {
      var row = chartProjects[0];
      tx.executeSql('SELECT project_name,startDate, SUM(duration) AS durationSum FROM timeInfo WHERE project_name = ? AND startDate BETWEEN strftime("%m-%d-%Y", ?) AND strftime("%m-%d-%Y", ?) GROUP BY startDate ORDER BY startDate ASC', 
        [row.project, row.startDate, row.endDate], nextProjDailyTime, null); 
    }); //dbtransaction            
  } 
  else
  {
    // call bar chart
    createBarChart();
  }
};

var getBarChartProjData = function() {
  chartProjects: new Array;
  chartProjects = [];
  dailyChartData: new Array;
  dailyChartData = [];

  db.transaction(function (tx) {
    var dpStartDate = new moment($("#fromChart").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
    var dpEndDate = new moment($("#toChart").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
    tx.executeSql('SELECT project_name FROM timeInfo WHERE startDate BETWEEN strftime("%m-%d-%Y", ?) AND strftime("%m-%d-%Y", ?) GROUP BY project_name', [dpStartDate, dpEndDate], function (tx, results) {
      var len = results.rows.length, i;
      if (len > 0) {
        for (i = 0; i < len; i++) {
          var task = results.rows.item(i);
          chartProjects.push({
              project: task.project_name,
              startDate: dpStartDate,
              endDate: dpEndDate
          });
        } // for
      } // if

      nextProjDailyTime(0,0); 
    }, null); // executesql
  }); //dbtransaction

 };


var createBarChart = function(barChartData) {
  //Generate some nice data.
  function finalBarChartData() {
    var data = [];
    var totalProj = dailyChartData.length
    var valuesArray = new Array(totalProj);
    for( var i = 0 ; i < totalProj; i++ ) 
    {
      valuesArray[i] = new Array(); 
    }

    var dpStartDate = new moment($("#fromChart").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
    var dpEndDate = new moment($("#toChart").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
    var range1 = moment.range(dpStartDate, dpEndDate);

    range1.by('days', function(moment) {
      var iteratedDate =moment.format('MM-DD-YYYY');
      var filtered = 0;

      // check if any project has this date
      for( var i = 0, len = dailyChartData.length; i < len; i++ ) {
        function hasData(element, index, array) {
          return (element.x == iteratedDate);
        }
        filtered  = dailyChartData[i].values.filter(hasData);
        if (filtered.length > 0){
          break;
        }
      }

      // update the value for that date
      if (filtered.length > 0){
        // update values for all
        var y = filtered; 

        for( var i = 0, projCnt = dailyChartData.length; i < projCnt; i++ ) 
        {

          for( var j = 0; j < dailyChartData[i].values.length; j++ )
          {
            var projDate = dailyChartData[i].values[j].x;
            if( projDate == iteratedDate ) 
            {
              valuesArray[i].push({x:iteratedDate,y:dailyChartData[i].values[j].y}); 
              break;
            }
            else if (projDate > iteratedDate)
            {
              valuesArray[i].push({x:iteratedDate,y:0}); 
              break;
            }
            else if (j == (dailyChartData[i].values.length -1) ) // no data found 
            {
              valuesArray[i].push({x:iteratedDate,y:0}); 
            }
          }
        }
      }
    });  

    for( var i = 0 ; i < totalProj; i++ ) 
    {
      data.push({values:valuesArray[i],key:dailyChartData[i].key}); 
    }
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

      chart.multibar.stacked(true); // default to stacked
      //chart.showControls(false); // don't show controls
      chart.xAxis
          .orient("bottom")
          .tickFormat(function(d) {
              return d3.time.format('%d-%b')(new Date(d));
          })
          .rotateLabels(-45);

      chart.yAxis
          .axisLabel('Work time')
          .orient("left")
          .tickFormat(d3.format('.02f'));


      d3.select('#bar-chart svg')
          .datum(finalBarChartData())
          .call(chart);

      nv.utils.windowResize(chart.update);

      return chart;
  });
};

var createPieChart = function(barChartData) {
  nv.addGraph(function() {
    var chart = nv.models.pieChart()
        .x(function(d) { return d.label })
        .y(function(d) { return d.value })
        .showLabels(true)     //Display pie labels
        .labelThreshold(.05)  //Configure the minimum slice size for labels to show up
        .labelType("percent") //Configure what type of data to show in the label. Can be "key", "value" or "percent"
        .donut(true)          //Turn on Donut mode. Makes pie chart look tasty!
        .donutRatio(0.35)     //Configure how big you want the donut hole size to be.
        ;

      d3.select("#pie-chart svg")
          .datum(pieChartProjectData)
          .transition().duration(350)
          .call(chart);

    return chart;
  });

};


document.addEventListener('DOMContentLoaded', function () {
  var currentTime = new Date();
  // First Date Of the month 
  var startDateFrom = new Date(currentTime.getFullYear(),currentTime.getMonth(),1);
  // Last Date Of the Month 
  
  // Summary By Project
  $("#from").datepicker({
    defaultDate: startDateFrom,
    changeMonth: true,
    changeYear: true,
    onSelect: function(dateText, inst) { 
        var dpStartDate = new moment($("#from").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
        var dpEndDate = new moment($("#to").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
        taskInterface.GetSummaryByProject(dpStartDate, dpEndDate);
     }
  }).datepicker("setDate", startDateFrom);

  $( "#to" ).datepicker({
    changeMonth: true,
    changeYear: true,
    onSelect: function(dateText, inst) { 
        var dpStartDate = new moment($("#from").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
        var dpEndDate = new moment($("#to").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
        taskInterface.GetSummaryByProject(dpStartDate, dpEndDate);
     }
  }).datepicker("setDate", new Date());


  // Daily Summary
  $("#fromDaily").datepicker({
    defaultDate: startDateFrom,
    changeMonth: true,
    changeYear: true,
    onSelect: function(dateText, inst) { 
        var dpStartDate = new moment($("#fromDaily").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
        var dpEndDate = new moment($("#toDaily").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
        taskInterface.GetDailySummary(dpStartDate, dpEndDate, false);
     }
  }).datepicker("setDate", startDateFrom);

  $( "#toDaily" ).datepicker({
    changeMonth: true,
    changeYear: true,
    onSelect: function(dateText, inst) { 
        var dpStartDate = new moment($("#fromDaily").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
        var dpEndDate = new moment($("#toDaily").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
        taskInterface.GetDailySummary(dpStartDate, dpEndDate, false);
     }
  }).datepicker("setDate", new Date());


  // Charts
  $("#fromChart").datepicker({
    defaultDate: startDateFrom,
    changeMonth: true,
    changeYear: true,
    onSelect: function(dateText, inst) { 
        getBarChartProjData();
     }
  }).datepicker("setDate", startDateFrom);

  $( "#toChart" ).datepicker({
    changeMonth: true,
    changeYear: true,
    onSelect: function(dateText, inst) { 
        getBarChartProjData();
     }
  }).datepicker("setDate", new Date());

  db.transaction(function (tx) {
    tx.executeSql('SELECT * FROM breakInfo', null, function (tx, results) {
      var len = results.rows.length, i;
      if (len <= 0) 
      {
       // event.preventDefault();
        taskInterface.handleBreakTime();
        $('#breakTimeModal').modal('toggle');
      } 

    }, null); // executesql
  }); //dbtransaction
  
  taskInterface.init();
  addListeners();
});



