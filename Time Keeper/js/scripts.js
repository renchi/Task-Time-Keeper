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
});

/**
 * Delete all records (drop table)
 */
function dropTaskTable() {
  db.transaction(function (tx) {
    tx.executeSql("DROP TABLE timeInfo", [], function (tx, results) {
      alert('Table timeInfo was droped');
    }, onError);
  });
}

/**
 * Exception hook
 */
function onError(tx, error) {
  alert(error.message);
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
      if (event.keyCode == 13) {
        taskInterface.playHandler();
      }
    });
    $('#newProject').keydown(function ( event ) {
      if (event.keyCode == 13) {
        taskInterface.playHandler();
      }
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
      taskInterface.dailySummary();
    });

    $("#dailyTable").bind( 'refresh-options.bs.table', function (options) {
        if ( taskInterface.consolidatedProjSummary.length == 0 )
        {
          taskInterface.nextDailyRecordWithProj(0,0);
        }
    });

    $("#summaryTable").bind( 'refresh-options.bs.table', function (options) {
        if ( taskInterface.consolidatedProjSummary.length == 0 )
        {
          taskInterface.nextRecord(0,0);
        }
    });
    $("#summaryTable").bind( 'column-switch.bs.table', function (e, field, checked) {
        if ( taskInterface.consolidatedProjSummary.length == 0 )
        {
          taskInterface.nextRecord(0,0);
        }
    });
  },

  getIdSelections: function ()  {
      return $.map($("#table").bootstrapTable('getSelections'), function (row) {
          return row.id
      });
  },

  SummaryByProject: function () {
      var currentTime = new Date();
      // First Date Of the month 
      var startDateFrom = new Date(currentTime.getFullYear(),currentTime.getMonth(),1);
      // Last Date Of the Month 
      //var startDateTo = new Date(currentTime.getFullYear(),currentTime.getMonth() +1,0);
       
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
            html.push('<p>Click &nbsp' + '<span class="glyphicon glyphicon-refresh"></span>' + ' button to get details.</p>');
            var taskData = "";
            if (i == 0){
              taskData = html.join('');
            }
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
            //detailsData = detailsData + task.name +" = " + roundedHours + " H";
            // if ( i < (len-1) ){
            //   detailsData = detailsData + ";  " ;
            // }
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

  dailySummary: function () {
      var currentTime = new Date();
      // First Date Of the month 
      var startDateFrom = new Date(currentTime.getFullYear(),currentTime.getMonth(),1);
      // Last Date Of the Month 
      //var startDateTo = new Date(currentTime.getFullYear(),currentTime.getMonth() +1,0);
       
      $("#fromDaily").datepicker({
        defaultDate: startDateFrom,
        changeMonth: true,
        changeYear: true,
        onSelect: function(dateText, inst) { 
            var dpStartDate = new moment($("#fromDaily").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
            var dpEndDate = new moment($("#toDaily").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
            taskInterface.GetDailySummary(dpStartDate, dpEndDate);
         }
      }).datepicker("setDate", startDateFrom);

      $( "#toDaily" ).datepicker({
        changeMonth: true,
        changeYear: true,
        onSelect: function(dateText, inst) { 
            var dpStartDate = new moment($("#fromDaily").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
            var dpEndDate = new moment($("#toDaily").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
            taskInterface.GetDailySummary(dpStartDate, dpEndDate);
         }
      }).datepicker("setDate", new Date());

    var dpStartDate = new moment($("#fromDaily").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
    var dpEndDate = new moment($("#toDaily").datepicker( 'getDate' )).format('YYYY-MM-DD'); 
    this.GetDailySummary(dpStartDate, dpEndDate);
  },

  GetDailySummary: function (dpStartDate, dpEndDate) {
    taskInterface.dailySummaryRows = [];
    taskInterface.consolidatedDailySummary = [];
    taskInterface.dailyProjectSummary = [];
    taskInterface.dailyProjectSummaryCopy = [];
    db.transaction(function (tx) {
      tx.executeSql('SELECT startDate, SUM(duration) AS durationSum FROM timeInfo WHERE startDate BETWEEN strftime("%m-%d-%Y", ?) AND strftime("%m-%d-%Y", ?) GROUP BY startDate ORDER BY startDate DESC', [dpStartDate, dpEndDate], function (tx, results) {
        var len = results.rows.length, i;
        rows = [];
        if (len > 0) {
          for (i = 0; i < len; i++) {
            var task = results.rows.item(i);

            var html = [];
            html.push('<p>Click &nbsp' + '<span class="glyphicon glyphicon-refresh"></span>' + ' button to get details.</p>');
            var taskData = "";
            if (i == 0){
              taskData = html.join('');
            }

            taskInterface.dailySummaryRows.push({
                taskDate: task.startDate,
                duration: Math.round10(moment.duration(task.durationSum).asHours(), -2),
                details: taskData
            });
          } // for
        } // if
        $('#dailyTable').bootstrapTable('load', taskInterface.dailySummaryRows );
      }, null); // executesql
    }); //dbtransaction
  },

  timeInfoData: function () {
    $('#play').html('<span class="glyphicon glyphicon-play-circle icon-success icon-main-size"></span>');

    db.transaction(function (tx) {
      tx.executeSql('SELECT * FROM timeInfo ORDER BY startTime DESC', [], function (tx, results) {
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
              var dif = Math.floor((new Date().getTime() - start.getTime()) / 1000)
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
      }, null); // executesql
    }); //dbtransaction
  },

  index: function () {
    this.timeInfoData();
    this.SummaryByProject();
    this.dailySummary();
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

          taskInterface.toggleRunText();

        } else {
          alert("Task " + id + " not found sorry!");
        }
      }, null);
    });
  },


  addSaveHandler: function ( event ) {
    var fTask = $('#addTaskName').val();
    var fProj = $('#addProjectName').val();

    if (fTask == null || fTask == "" || fProj == null || fProj == "") {
        alert("Task and project names must be filled out");
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

      tx.executeSql("INSERT INTO timeInfo (id, project_name, name, running, startDate, startTime, endTime, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", 
          [id, project_name, name, 0, dateStarted, timeStarted, timeEnded, newDuration],
          function (tx, result) {
            taskInterface.index();
          },
          onError);
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
        alert("Task and project names must be filled out");
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

  //////////////////////////////////////////////////////////////////////////////
  // start task
  //////////////////////////////////////////////////////////////////////////////

  startTask: function (task) {
    window.clearInterval(taskInterface.intervals[task.ID]); // remove timer

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
    window.clearInterval(taskInterface.intervals[task.ID]); // remove timer

    var start, stop, dif = 0;

    db.transaction(function (tx) {
      tx.executeSql('SELECT * FROM timeInfo WHERE id = ?', [task.ID], function (tx, results) {
        if (results.rows.length > 0) {
          start = new Date(results.rows.item(0).startTime); // read from DB
          stop = new Date().valueOf(); // now
          dif = stop - start; // time diff in milliseconds
        } else {
          alert('Task ' + task.ID + ' not found!');
        }
      }, null, onError);
    });

    // update record
    db.transaction(function (tx) {
      var projName = $('#newProject').val();
      var name = $('#newTask').val();
      tx.executeSql("UPDATE timeInfo SET project_name = ?, name = ?, running = ?, endTime = ?, duration = ? WHERE id = ?", 
        [projName, name, 0, stop, dif, task.ID], null, onError);

      taskInterface.index();
      $('#timer').text("0 sec");
      $('#newTask').val('').focus();
      $('#newProject').val('');
    });

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
            alert("Task " + id + "not found!");
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
            alert("Task " + id + "not found!");
          }
        }, null);
      });
  }
};
