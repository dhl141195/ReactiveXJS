// Setup stream
var refreshButton = document.querySelector('.refresh');
var refreshClickStream = Rx.Observable.fromEvent(refreshButton, 'click');

var requestStream = refreshClickStream
    .startWith('startup click')
    .map(function () {
        var randomOffset = Math.floor(Math.random() * 500);
        return 'https://api.github.com/users?since=' + randomOffset;
    });

var responseStream = requestStream.flatMap(function (requestUrl) {
    return Rx.Observable.fromPromise(jQuery.getJSON(requestUrl));
});

function createSuggestionStream() {
    return responseStream
        .map(function (listUser) {
            return listUser[Math.floor(Math.random() * listUser.length)];
        })
        .merge(refreshClickStream.map(function () {
            return null;
        }))
        .startWith(null);
}


// Render function
function renderSuggestion(suggestedUser, selector) {
    var suggestionEl = document.querySelector(selector);
    if (suggestedUser === null) {
        suggestionEl.style.visibility = 'hidden';
    } else {
        suggestionEl.style.visibility = 'visible';
        var usernameEl = suggestionEl.querySelector('.username');
        usernameEl.href = suggestedUser.html_url;
        usernameEl.textContent = suggestedUser.login;
        var imgEl = suggestionEl.querySelector('img');
        imgEl.src = "";
        imgEl.src = suggestedUser.avatar_url;
    }
}

// Start subscribing

suggestion1Stream = createSuggestionStream();
suggestion2Stream = createSuggestionStream();
suggestion3Stream = createSuggestionStream();

suggestion1Stream.subscribe(function (suggestedUser) {
    renderSuggestion(suggestedUser, '.suggestion1')
});

suggestion2Stream.subscribe(function (suggestedUser) {
    renderSuggestion(suggestedUser, '.suggestion2')
});

suggestion3Stream.subscribe(function (suggestedUser) {
    renderSuggestion(suggestedUser, '.suggestion3')
});


// refreshStream  ------s------------
// requestStream  -r----r------------
// responseStream ---R----R----------
// sgt1Stream     -N-d--N-d----------
// sgt2Stream     -N-d--N-d----------
// sgt3Stream     -N-d--N-d----------