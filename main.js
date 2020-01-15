var apiKey = '';
var clientId = '';

var discoveryDocs = ["https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest"];
var scopes = 'https://www.googleapis.com/auth/youtube.force-ssl';

var googleAuth;
var checked = true;

var loader = document.getElementById('loader');

var userName = document.getElementById('user-name');
var welcomeContent = document.getElementById('welcome-content');
var authorizedContent = document.getElementById('authorized-content');
var unsubscribeContent = document.getElementById('unsubscribe-content');
var unsubscriptions = document.getElementById('unsubscriptions');
var resubscribeContent = document.getElementById('resubscribe-content');
var resubscriptions = document.getElementById('resubscriptions');
var fileInput = document.getElementById('file-input');
var donationContent = document.getElementById('donation-content');

var homeNavItem = document.getElementById('home-nav-item');
var unsubscribeNavItem = document.getElementById('unsubscribe-nav-item');
var resubscribeNavItem = document.getElementById('resubscribe-nav-item');
var authorizeNavItem = document.getElementById('authorize-nav-item');
var signoutNavItem = document.getElementById('signout-nav-item');

var uploadButton = document.getElementById('upload-button');
var backupButton = document.getElementById('backup-button');
var unsubscribeButton = document.getElementById('unsubscribe-button');
var resubscribeButton = document.getElementById('resubscribe-button');

function handleClientLoad() {
    // Load the API client and auth2 library
    gapi.load('client:auth2', initClient);
}

function initClient() {
    gapi.client.init({
        apiKey: apiKey,
        discoveryDocs: discoveryDocs,
        clientId: clientId,
        scope: scopes
    }).then(function () {
        googleAuth = gapi.auth2.getAuthInstance();

        // Listen for sign-in state changes.
        googleAuth.isSignedIn.listen(updateSigninStatus);

        // Handle the initial sign-in state.
        updateSigninStatus(googleAuth.isSignedIn.get());

        authorizeNavItem.onclick = handleAuthClick;
        unsubscribeNavItem.onclick = handleUnsubscribeNavItemClick;
        resubscribeNavItem.onclick = handleResubscribeNavItemClick;
        signoutNavItem.onclick = handleSignoutClick;
        uploadButton.onclick = handleUploadClick;
        homeNavItem.onclick = handleHomeClick;
        backupButton.onclick = handleBackupClick;
        unsubscribeButton.onclick = handleUnsubscribeClick;
        resubscribeButton.onclick = handleResubscribeClick;
    });
}

function updateSigninStatus(isSignedIn) {
    var user;
    var isAuthorized = false;

    if (googleAuth.isSignedIn.get()) {
        user = googleAuth.currentUser.get();
        isAuthorized = user.hasGrantedScopes(scopes);
    }

    if (isAuthorized) {
        loader.style.display = 'none';

        userName.innerHTML = user.getBasicProfile().getEmail();

        authorizeNavItem.style.display = 'none';
        unsubscribeContent.style.display = 'none';
        resubscribeContent.style.display = 'none';

        homeNavItem.style.display = 'inline-block';
        welcomeContent.style.display = "block";
        signoutNavItem.style.display = 'block';
        unsubscribeNavItem.style.display = 'inline-block';
        resubscribeNavItem.style.display = 'inline-block';
        authorizedContent.style.display = 'block';
    }

    else {
        signoutNavItem.style.display = 'none';
        authorizedContent.style.display = 'none';

        homeNavItem.style.display = 'inline-block';
        authorizeNavItem.style.display = 'inline-block';
        welcomeContent.style.display = 'block';
    }

    donationContent.style.display = 'block';
}

function handleAuthClick(event) {
    googleAuth.signIn();
}

//TO-DO: proper sign-out, currently it does not sign out immediately so check if it's possible to make it easier. disconnect();
function handleSignoutClick(event) {
    alert("Not implemented yet. If you want to change your account you have to revoke acces of this app in your Google account settings.");
}

function handleHomeClick(event) {
    updateSigninStatus(false);
}

// =======================================================================

// ==============================UNSUBSCRIBE==============================

function handleUnsubscribeNavItemClick(event) {
    loader.style.display = 'block';

    welcomeContent.style.display = 'none';
    authorizedContent.style.display = 'none';
    resubscribeContent.style.display = 'none';

    localStorage.removeItem("unsubscriptions");

    getSubscriptions();
}

function getSubscriptions(token) {
    var listOfSubscriptions = new Array();

    var rq = {
        part: 'id, snippet',
        mine: true,
        maxResults: 50
    };
    if (token) { // If we got a token from previous call
        rq.pageToken = token; // .. attach it to the new request
    }
    var request = gapi.client.youtube.subscriptions.list(rq);

    request.execute(function (response) {
        response.items.forEach(element => {
            var subscription = {
                Id: element.id,
                Name: element.snippet.title,
                Icon: element.snippet.thumbnails.default.url,
                Description: element.snippet.description,
                ChannelId: element.snippet.resourceId.channelId,
            }

            listOfSubscriptions = JSON.parse(localStorage.getItem("unsubscriptions"));

            if (listOfSubscriptions == null) {
                listOfSubscriptions = new Array();
            }

            listOfSubscriptions.push(subscription);
            listOfSubscriptions.sort(compare);
            localStorage.setItem("unsubscriptions", JSON.stringify(listOfSubscriptions));
        });

        var next = response.nextPageToken; // get token for next page
        if (next) { // if has next
            getSubscriptions(next); // recurse with the new token
        }
        else {
            loader.style.display = 'none';
            unsubscribeContent.style.display = 'block';

            displaySubscriptions(unsubscriptions, listOfSubscriptions);
        }
    });
}

function handleUnsubscribeClick(event) {
    var checkedChannels = getCheckedChannels();
    if (checkedChannels == null) {
        alert("error");
    }

    else {
        checkedChannels.forEach(element => {
            gapi.client.youtube.subscriptions.delete({
                "id": element
            }).then(function (response) {
                console.log("Response", response);
            }, function (err) { console.error("Execute error", err); });
        });
    }
}

function handleBackupClick(event) {
    var checkedChannels = getCheckedChannels();
    var list = JSON.parse(localStorage.getItem("unsubscriptions"));
    var backup = new Array();
    if (list == null || checkedChannels == null) {
        alert("error");
    }

    else {
        checkedChannels.forEach(element => {
            var resp = list.find(c => c.Id == element);
            if (resp != null) {
                backup.push(resp);
            }
        });
    }

    //download
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
    var dlAnchorElem = document.getElementById('downloadAnchorElem');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "backup.json");
    dlAnchorElem.click();
}

// =======================================================================

// ==============================RESUBSCRIBE==============================

function handleResubscribeNavItemClick(event) {
    welcomeContent.style.display = 'none';
    authorizedContent.style.display = 'none';
    unsubscribeContent.style.display = 'none';

    resubscribeContent.style.display = 'block';

    localStorage.removeItem("resubscriptions");
}

function handleUploadClick(event) {
    loader.style.display = 'block';
    resubscribeContent.style.display = 'none';

    var file = fileInput.files[0];

    var reader = new FileReader();

    reader.addEventListener('load', function (e) {
        var content = e.target.result;
        var list = JSON.parse(content);
        list.sort(compare);
        localStorage.setItem("resubscriptions", JSON.stringify(list));

        loader.style.display = 'none';
        resubscribeContent.style.display = 'block';
        displaySubscriptions(resubscriptions, list);
    });

    reader.readAsBinaryString(file);
}

function handleResubscribeClick(event) {
    var checkedChannels = getCheckedChannels();
    var numberOfChannels = checkedChannels.length;
    var list = JSON.parse(localStorage.getItem("resubscriptions"));
    var resubscribe = new Array();
    if (list == null || checkedChannels == null) {
        alert("error");
    }

    else {
        checkedChannels.forEach(element => {
            var resp = list.find(c => c.Id == element);
            if (resp != null) {
                resubscribe.push(resp);
            }
        });

        resubscribe.forEach(element => {
            var id = element.ChannelId;
            gapi.client.youtube.subscriptions.insert({
                part: "id, snippet",
                snippet: {
                    resourceId: {
                        kind: "youtube#channel",
                        channelId: id
                    }
                }
            }).then(function (response) {
                numberOfChannels--;
            },
                function (err) {
                    console.error("Execute error", err);
                    alert("Error while resubscribing. " + err);
                });
        });

        if (numberOfChannels == 0) {
            alert("Succesfully resubscribed!");
        }
    }
}

// =======================================================================

// ================================GENERAL================================

function displaySubscriptions(container, list) {
    container.innerHTML = "";
    var content = "";
    list.forEach(element => {
        content = "<div class='row border rounded'><div class='col-2'>" +
            "<input id='" + element.Id + "' type='checkbox' checked name='checkbox'/>" +
            "<img src='" + element.Icon + "'/></div>" +
            "<div class='col-10'><a href='https://www.youtube.com/channel/" + element.ChannelId + "'>" + element.Name + "</a>" +
            "<div>" + element.Description + "</div></div></div><br />";

        container.innerHTML += content;
    });
}

function getCheckedChannels() {
    var channels = document.getElementsByTagName("input");
    var checkedChannels = new Array();
    for (var i = 0; i < channels.length; i++) {
        if (channels[i].checked) {
            checkedChannels.push(channels[i].id);
        }
    }

    return checkedChannels;
}

function allChecks() {
    var channels = document.getElementsByTagName("input");
    for (var i = 0; i < channels.length; i++) {
        if (checked) {
            channels[i].checked = false;
        }

        else {
            channels[i].checked = true;
        }
    }

    checked = !checked;
}

function compare(a, b) {
    if (a.Name < b.Name) {
        return -1;
    }
    if (a.Name > b.Name) {
        return 1;
    }
    return 0;
}