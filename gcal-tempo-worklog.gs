var TEMPO_API_URL = 'https://api.tempo.io/core/3/worklogs';
var JIRA_TOKEN = 'Bearer <enter access token>';
var JIRA_AUTHOR_ID = '<enter Jira author ID>';
var CALENDAR_ID = '<enter google calendar id>';
var ISSUE_REGEX = /<enter regex>/i;

var _needReview = false;


function ENTRYPOINT_FillTempo() {
  fillTempo(CALENDAR_ID);
}

function fillTempo(calendarId, skip, take) {
  var events = _GetEventsFromLastDays(calendarId, skip, take);
  if (events.length == 0) {
    Logger.log('No events found.');
    return;
  }

  _HandleEvents(events);
  
  return;


  /* Private Functions */
  function _HandleEvents(events) {
    for (var i = 0; i < events.length; i++) {
      var event = events[i];
      var issue = _GetIssue(event);

      if (issue) {
        _CreateWorkLog(event, issue);
      }
    }
  }

  function _CreateWorkLog(event, issue) {
    var startDate = new Date(event.start.dateTime);
    var endDate = new Date(event.end.dateTime);
    var duration = getSeconds(endDate - startDate);
    var payload = {
      authorAccountId: JIRA_AUTHOR_ID,
      issueKey: issue,
      startDate: formatDate(startDate),
      startTime: formatTime(startDate),
      timeSpentSeconds: duration,
      description: event.summary + ' - ' + event.description,
    };
    _PostToJira(payload);
    Logger.log('%s -- %s - %s - %s secs', startDate, event.summary, event.description, duration);
  }

  function _GetEventsFromLastDays(calendarId, skip, take) {
    var start = new Date();
    var end = new Date();

    skip = skip || 1;
    take = take - 1 || 0;

    start.setDate(start.getDate() - skip);
    end.setDate(end.getDate() - (skip - take));

    // todo: check end before start

    var dateMin = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
    var dateMax = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 0);

    var optionalArgs = {
      timeMin: dateMin.toISOString(),
      timeMax: dateMax.toISOString(),
      showDeleted: false,
      singleEvents: true,
      maxResults: 30,
      orderBy: 'startTime'
    };

    var response = Calendar.Events.list(calendarId, optionalArgs);
    return response.items;
  }

  function _GetIssue(event) {
    return _FindIssue(event.summary) || (event.description && _FindIssue(event.description.replace(" ", "")));
  }

  function _FindIssue(value) {
    try {
      var match = (value || "").match(ISSUE_REGEX);
      return match ? match[0] : null;
    }
    catch (e) {
      Logger.Log(e);
    }
  }

  function _PostToJira(payload) {
    var options = {
      muteHttpExceptions: true,
      method: 'post',
      payload: JSON.stringify(payload),
      headers: {
        Authorization: JIRA_TOKEN
      },
      contentType: 'application/json; charset=utf-8'
    };

    //Logger.log(options);
    var response = UrlFetchApp.fetch(TEMPO_API_URL, options);
    //Logger.log(response);
  }

}





function getSeconds(milliseconds) {
  var MS_PER_SEC = 1000;
  return Math.floor(milliseconds / MS_PER_SEC);
}

function formatDate(date) {
  var year = date.getFullYear();
  var day = date.getDate();
  var month = date.getMonth() + 1;

  if (day < 10) {
    day = '0' + day;
  }

  if (month < 10) {
    month = '0' + month;
  }

  return year + '-' + month + '-' + day;
}

function formatTime(date) {
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var seconds = date.getSeconds();

  if (minutes < 10) {
    minutes = '0' + minutes;
  }

  if (seconds < 10) {
    seconds = '0' + seconds;
  }

  return hours + ':' + seconds + ':' + minutes;
}
