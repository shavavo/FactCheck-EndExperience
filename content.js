function createElementFromHTML(htmlString) {
    var div = document.createElement('div');
    div.innerHTML = htmlString.trim();
  
    // Change this to div.childNodes to support multiple top-level nodes
    return div.firstChild; 
}

function generateCardHTML(id, card) {
    var facts = ``
    for (var i in card['conclusion']) {
        facts += `
            <a href="${card["explaination"][i]}" target="_blank">
                <div class="conclusion__container">
                    <u><p class="conclusion__source">(${card["source"][i]})</p></u>
                    <h2 class="conclusion">${card["conclusion"][i]}</h2>
                </div>
            </a>
        `
    }

    return createElementFromHTML(`
        <div class="factcheck__overlay-check fadeIn">
            <div class="bar">
                <div id="progress-${id}" class="progress"></div>
            </div>
            <p class="subtitle">We heard:</p>
            <p class="quote">${card["quote"]}</p>
            <p class="subtitle">Related fact checks indicate: </p>
            ${facts}
        </div>
    `)
}

function youtube_parser(url){
    var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
    var match = url.match(regExp);
    return (match&&match[7].length==11)? match[7] : false;
}

function fadeOut(node, callback) {
    opacity = 1.0;
    var id = setInterval(frame, 10);

    function frame() {
        if (opacity <= 0.0) {
            clearInterval(id);
            callback(node);
        } else {
            opacity-=0.05; 
            node.style.opacity = opacity + ''; 
        }
    }
}

var App = {
    currentSession: null,
 
    init: function() {
        this.bindPathChange();
    },

    bindPathChange: function() {
        setTimeout(5000);
        window.addEventListener("spfdone", this.newPath.bind(this, null)); // new youtube design    
        window.addEventListener("yt-navigate-finish", this.newPath.bind(this, null)); // new youtube design    
    },

    newPath: function(callback) {
        youtube_id = youtube_parser(location.href);

        console.log(`New Video: ${youtube_id}`);

        // Send youtube ID to background script to make requests to techcheck central
        // This is required because we cannot make requests to http within youtube's https
        chrome.runtime.sendMessage({greeting: {'id': youtube_id, 'last_update': null}}, function(response) {
            this.newSession(response.data);
            console.log("object: %O", response.data);
        }.bind(this));

        if(callback) callback();
    },

    newSession: function(data) {
        console.log("New Session");

        if(this.currentSession)
            this.currentSession.clear();

        // this.currentSession = Session.init({}, "Mon, 22 Apr 2019 04:49:21 GMT");

        if(data)
            this.currentSession = Session.init(data["cards"], data["timestamp"]);
        else 
            this.currentSession = null;
    }
}

var Session = {
    init: function(data, timestamp) {
        this.cards = data;
        this.last_update = timestamp;
        
        this.initUIComponents();
        this.checkPlayerExists();

        return this;
    },

    clear: function() {
        for (var x in this.components) {
            if(this.components[x])
                this.components[x].remove();
        }

        clearInterval(this.liveInterval);
    },

    initUIComponents: function() {
        this.components =  {
            cardContainer: createElementFromHTML(`<div class="factcheck__overlay" />`),
            hiddenCards: createElementFromHTML(`<div/>`),
            placeholder: createElementFromHTML(`<div class="placeholder" />`),
            openHistoryButton: createElementFromHTML(`
                <div class="tooltip">
                    <button class="openHistory">&#8250;</button>
                    <span class="tooltiptext">History</span>
                </div>
            `),
            sidebar: createElementFromHTML(`
                <div id="historySidebar" class="sidebar">
                    <div class="historyHeader">
                        <h1 class="historyLabel">History</h1> 
                        <button class="closeHistory" id="closeHistory">Close</button>
                    </div>
                    
                </div>
            `),
            historyContainer: createElementFromHTML(`
                <div class="historyContainer" />
            `),
        };

        components = this.components;
        components.cardContainer.appendChild(components.hiddenCards);
        components.cardContainer.appendChild(components.placeholder);
        components.sidebar.appendChild(components.historyContainer);
    },


    checkPlayerExists: function() {
        var checkExist = setInterval(function() {
            if (document.getElementById('ytd-player')) {
                this.playerFound();
                clearInterval(checkExist);
            }
        }.bind(this), 100);
    },

    playerFound: function() {
        var liveBadge = document.querySelector('.ytp-live-badge');
        var style = getComputedStyle(liveBadge);
        var live = (style.display=="none") ? false:true;

        if(live) this.initLiveRefresh();


        var defaultPlayer = document.getElementById('ytd-player');
        this.player = document.querySelector('video');
        
        components = this.components;
        defaultPlayer.children[0].children[0].appendChild(components.cardContainer);
        defaultPlayer.children[0].children[0].appendChild(components.openHistoryButton);
        defaultPlayer.children[0].children[0].appendChild(components.sidebar);
        
        components.openHistoryButton.addEventListener('click', function(){
            components.sidebar.style.width ='20%';
            components.openHistoryButton.style.opacity = '0';
        });
        document.getElementById("closeHistory").addEventListener('click', function() {
            components.sidebar.style.width ='0';
            components.openHistoryButton.style.opacity = '1';
        });


        this.filterOld();
        this.player.ontimeupdate = this.onTimeUpdate.bind(this);
    },

    initLiveRefresh: function() {
        // Refresh every 5s
        this.liveInterval = setInterval(function() {
            chrome.runtime.sendMessage({greeting: {'id': youtube_id, 'last_update': this.last_update}}, function(response) {
                var data = response.data;
                this.cards = this.cards.concat(data["cards"]);
                this.last_update = data["timestamp"];
            }.bind(this));
        }.bind(this), 5000);
    },

    filterOld: function() {
        for (var id in this.cards) {
            var card = this.cards[id]
            if(card["time"] < this.player.currentTime) {
                var p = generateCardHTML(id, card);
                this.cards[id]["node"] = p;
                var history = this.components.historyContainer;
                history.insertBefore(p, history.firstChild);

                var elem = document.getElementById("progress-" + id);
                elem.style.width = "100%";
            }
        }
    },

    onTimeUpdate: function() {
        var components = this.components;
        
        for(var id in this.cards) {
            var card = this.cards[id]

            if(card[0]["active"]==false
                && card[0]["time"]<=this.player.currentTime && this.player.currentTime<=card[0]["time"]+5) {

                var p = generateCardHTML(id, card);
                components.cardContainer.insertBefore(p, components.placeholder);
                components.cardContainer.scrollTop = components.hiddenCards.scrollHeight;

                this.cards[id]["active"] = true;
                this.cards[id]["node"] = p;
                this.cards[id]["interval"] =  this.move(id);
            }
        }
    },

    move: function(card_id) {
        components = this.components;

        var elem = document.getElementById("progress-" + card_id); 
        var width = 1;
        var id = setInterval(frame.bind(this), 10);

        function frame() {
          if (width >= 100) {
            clearInterval(id);
            
            var node = this.cards[card_id]['node'];

            if (!node)
                return;
          
            fadeOut(node, function(node) {
                this.components.historyContainer.appendChild(node);
                node.style.opacity = '1';
            }.bind(this));
          } else {
            width += .05; 
            elem.style.width = width + '%'; 
          }
        };
    
        return id;
    }
}

App.init();


// var checkExist = setInterval(function() {
//     // Above Title Text
//     if (document.getElementById('ytd-player')) {
//         console.log("Exists!");
//         var defaultPlayer = document.getElementById('ytd-player');
//         var p = document.createElement("p");
//         p.children = "Testing123"
//         defaultPlayer.children[0].appendChild(p)

//        clearInterval(checkExist);
//     }
// }, 100);


















