//execute when installed or updated
chrome.runtime.onInstalled.addListener(function () {
    chrome.identity.getAuthToken({ 'interactive': true }, function (token) {
        console.log(token);

        let init = {
            method: 'GET',
            async: true,
            headers: {
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            'contentType': 'json'
        };
        //TODO タイムゾーン等時間の調整
        const params = {
            timeMin: '2020-08-06T09:59:59.000+09:00',
            timeMax: '2020-08-06T23:59:59.000+09:00'
        };
        const queryString = Object.keys(params).map(name => `${name}=${encodeURIComponent(params[name])}`).join('&');
        console.log(queryString);

        fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?' + queryString, init)
            .then((response) => response.json()) // Transform the data into json
            .then(function (data) {
                // console.log(data.items);
                for (let i in data.items) {
                    console.log(data.items[i]['summary']);
                    console.log(data.items[i]['start']);
                    console.log(data.items[i]['hangoutLink']);
                }




            })
    })
    // chrome.identity.removeCachedAuthToken(object details, function callback)
});
// chrome.storage.sync.set({ color: '#3aa757' }, function () {
//     console.log("The color is green.");
// });
// for (let i = 0; i < 5; i++) {
//     setTimeout(() => { console.log(i) }, 3000);
// }
// })



function sleep(waitMsec) {
    var startMsec = new Date();

    // 指定ミリ秒間だけループさせる（CPUは常にビジー状態）
    while (new Date() - startMsec < waitMsec);
}


