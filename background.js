function createCheckAlarm() {
    chrome.alarms.create('check', {
        delayInMinutes: 0.1,
        periodInMinutes: 0.1,
    });
}

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
                //TODO 設定した値分前にアラームをセットする
                //設定した時間を既に過ぎていたらすぐに立ち上がる
                for (let i in data.items) {
                    start = Date.parse(data.items[i]['start']['dateTime']);
                    //今日の現在時刻以降開始のmeetingのみセットする
                    if (start > current) {
                        // Create meeting alerms
                        chrome.alarms.create(data.items[i]['hangoutLink'], {
                            when: Date.parse(data.items[i]['start']['dateTime']),
                        });
                        console.log('set meeting at' + data.items[i]['start']['dateTime'])
                    }
                }
            })
    })
}
//execute when installed or updated
chrome.runtime.onInstalled.addListener(function () {
    chrome.alarms.clearAll();
    //初回は1分後。その後はチェックアラームを30分おきにセット
    console.log('start up!');
    createCheckAlarm();
});

//何かの拍子にcheckアラームが消えていたら再セット
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
