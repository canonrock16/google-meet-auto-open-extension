const beforeMeetingMinutes = 5;

const scope = "https://www.googleapis.com/auth/calendar.readonly";
//webアプリ用その2
const client_id = "799068841757-bk7a050dhbr30uihso94q19kq38m3sts.apps.googleusercontent.com";
const client_secret = "KKA39Gu15tGPgx88D3846tZY";

let retryCount = 3;

//set check alarm every 30 minutes.
function createCheckAlarm() {
    chrome.alarms.create('check', {
        delayInMinutes: 0.1,
        periodInMinutes: 0.1,
    });
}

function getTimeParam() {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;
    let date = now.getDate();
    month = ('0' + month).slice(-2);
    date = ('0' + date).slice(-2);
    const params = {
        timeMin: year + '-' + month + '-' + date + 'T00:00:00.000+09:00',
        timeMax: year + '-' + month + '-' + date + 'T23:59:59.000+09:00'
    };
    return params
}

function getEndOfToday() {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;
    let date = now.getDate();
    month = ('0' + month).slice(-2);
    date = ('0' + date).slice(-2);
    return Date.parse(year + '-' + month + '-' + date + 'T23:59:59.000+09:00')
}

function paramsToQueryString(params) {
    return Object.entries(params).map((e) => `${e[0]}=${e[1]}`).join('&')
}

//dealing with when meeting deleted.
function clearAllMeetingAlarm() {
    return new Promise((resolve, reject) => {
        console.log('clear start!')
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

function getToken() {
    return new Promise((resolve, reject) => {
        console.log('auth start!')
        const redirectURL = chrome.identity.getRedirectURL("oauth2");

        let authURL = 'https://accounts.google.com/o/oauth2/v2/auth';
        let auth_params = {
            client_id: client_id,
            // redirect_uri: "urn:ietf:wg:oauth:2.0:oob",
            redirect_uri: redirectURL,
            response_type: 'code',
            access_type: 'offline',
            scope: scope,
        };
        chrome.identity.launchWebAuthFlow({ url: authURL + '?' + paramsToQueryString(auth_params), interactive: true }, (responseURL) => {
            let code = new URL(responseURL).searchParams.get("code");
            let params = {
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirectURL,
                // "redirect_uri": "urn:ietf:wg:oauth:2.0:oob"
            };
            console.log(paramsToQueryString(params));
            // 入力した認証コードを使用してアクセストークンを取得
            fetch("https://www.googleapis.com/oauth2/v3/token", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: paramsToQueryString(params)
            }).then(function (res) {
                if (res.status != 200) {
                    throw new Error("failed retrieve oauth token");
                }
                return res.json();//return json if res=OK
            }).then(function (data) {
                console.log('access_token:' + data.access_token);
                // console.log('refresh_token:' + data.refresh_token);
                resolve(data.access_token);
            }).catch(function (error) {
                console.log(error);
            });
        })
    })
}

function checkMeeting(token) {
    console.log('check start!')
    console.log('token:' + token);
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
        .then((response) => {
            if (response.ok) {
                return response.json()// Transform the data into json
            }
            //if not OK
            throw new Error(response);
        })
        .then(function (data) {
            current = new Date().getTime();
            today_end = getEndOfToday();
            for (let i in data.items) {
                //set alarm for only meetings staring the rest of today.
                openTabTime = Date.parse(data.items[i]['start']['dateTime']) - beforeMeetingMinutes * 60 * 1000;
                if (openTabTime > current && openTabTime <= today_end) {
                    // Create meeting alerms
                    chrome.alarms.create(data.items[i]['hangoutLink'], {
                        when: openTabTime,
                    });
                    console.log('set meeting ' + data.items[i]['summary'])
                }
            }
        })
        .catch(error => {
            // This status may indicate that the cached access token was invalid. Retry once with a fresh token.
            console.error('cannot get plans...');
            console.error(error);
            retryCount--;
            if (retryCount > 0) {
                console.log('retry!');
                clearAllMeetingAlarm().then(getToken().then((token) => checkMeeting(token)));
            }
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
        clearAllMeetingAlarm().then(getToken().then((token) => checkMeeting(token)));
        retryCount = 3;//reset retry count.
    } else {
        //when alarm is for meeting
        chrome.tabs.create({ url: alarm.name });
        // console.log(alarm.name)
    }
});
