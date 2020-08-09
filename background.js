const beforeMeetingMinutes = 5;

//set check alarm every 30 minutes.
function createCheckAlarm() {
    chrome.alarms.create('check', {
        delayInMinutes: 0.1,
        periodInMinutes: 0.1,
    });
}

//dealing with when meeting deleted.
function clearAllMeetingAlarm() {
    console.log('clear start!')
    return new Promise((resolve, reject) => {
        chrome.alarms.getAll(
            function (alarms) {
                for (let alarm in alarms) {
                    if (alarm.name !== 'check') {
                        chrome.alarms.clear(alarm.name)
                    }
                }
            }
        )
    })
}
function getTimeParam() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const params = {
        timeMin: year + '-' + month + '-' + date + 'T00:00:00.000+09:00',
        timeMax: year + '-' + month + '-' + date + 'T23:59:59.000+09:00'
    };
    return params
}

function checkMeeting() {
    console.log('check start!')
    //TODO トークン永続化
    chrome.identity.getAuthToken({ 'interactive': true }, function (token) {
        // console.log(token);
        let init = {
            method: 'GET',
            async: true,
            headers: {
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            'contentType': 'json'
        };
        params = getTimeParam();
        const queryString = Object.keys(params).map(name => `${name}=${encodeURIComponent(params[name])}`).join('&');

        fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?' + queryString, init)
            .then((response) => response.json()) // Transform the data into json
            .then(function (data) {
                current = new Date().getTime();
                for (let i in data.items) {
                    //set alarm for only meetings staring in future.
                    openTabTime = Date.parse(data.items[i]['start']['dateTime']) - beforeMeetingMinutes * 60 * 1000;
                    if (openTabTime > current) {
                        // Create meeting alerms
                        chrome.alarms.create(data.items[i]['hangoutLink'], {
                            when: openTabTime,
                        });
                        console.log('set meeting at' + openTabTime)
                    }
                }
            })
    })
}
//execute when installed or updated
chrome.runtime.onInstalled.addListener(function () {
    chrome.alarms.clearAll();
    console.log('start up!');
    createCheckAlarm();
});

//set alarm again if check alarm vanished(maybe unnecessary)
chrome.tabs.onCreated.addListener(function () {
    chrome.alarms.getAll(
        function (alarms) {
            if (!alarms.some(item => item.name === 'check')) {
                console.log('vanished!');
                createCheckAlarm();
            } else {
                console.log('not vanished!');
            }
        }
    )
})

// Listen alarms
chrome.alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name === 'check') {
        console.log('check!')
        clearAllMeetingAlarm().then(checkMeeting());
    } else {
        //when alarm is for meeting
        console.log(alarm.name)
        // chrome.tabs.create({ url: alarm.name });
    }
});
