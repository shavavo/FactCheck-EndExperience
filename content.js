function createElementFromHTML(htmlString) {
    var div = document.createElement('div');
    div.innerHTML = htmlString.trim();
  
    // Change this to div.childNodes to support multiple top-level nodes
    return div.firstChild; 
}

function setUpCollapsible(coll, id) {
    coll.addEventListener("click", function() {
        this.classList.toggle("active");
        var content = this.nextElementSibling;
        if (content.style.maxHeight){
            content.style.maxHeight = null;
        } else {
            content.style.maxHeight = content.scrollHeight + "px";
        } 

        // clearInterval(cards[id]['interval'])
    });
}

function scrollTo(element, to, duration) {
    if (duration <= 0) return;
    var difference = to - element.scrollTop;
    var perTick = difference / duration * 10;

    setTimeout(function() {
        element.scrollTop = element.scrollTop + perTick;
        if (element.scrollTop === to) return;
        scrollTo(element, to, duration - 10);
    }, 10);
}

function generateCardHTML(id, card) {
    return createElementFromHTML(`
        <div class="factcheck__overlay-check fadeIn">
            <div class="bar">
                <div id="progress-${id}" class="progress"></div>
            </div>
            <h4 class="title">Fact Check from ${card[0]["source"]}</h4>
            <p class="subtitle">We heard:</p>
            <p class="quote">${card[0]["quote"]}</p>
            <p class="subtitle">The facts say: </p>
            <h2 class="conclusion">${card[0]["conclusion"]}</h2>

            <button class="collapsible" id="collapsible-${id}">Explanation +</button>
            <div class="content">
                <p><a href="${card[0]["explanation"]}" target="_blank">Link to Article</a></p>
            </div>
        </div>
    `)
}

function youtube_parser(url){
    var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
    var match = url.match(regExp);
    return (match&&match[7].length==11)? match[7] : false;
}

function fadeOut(node) {
    opacity = 1.0;
    var id = setInterval(frame, 10);

    function frame() {
        if (opacity <= 0.0) {
            clearInterval(id);
        } else {
            opacity-=0.05; 
            node.style.opacity = opacity + ''; 
        }
    }
}

// ID to DATA
var testCards = {
    0: {
        "active": false,
        "quote": "\"We have unleashed a revolution in American Energy -- the United States is now the number one producer of oil and natural gas in the world.\"",
        "explanation": "Production dipped in 2015 and 2016 as a result of overproduction and a collapse in oil prices, but recovered quickly once supply stabilized and prices increased, just as Trump was coming into office.",
        "source": "Politifact",
        "time": 5,
        "conclusion": "Not the Full Story",
    },
    1: {
        "active": false,
        "quote": "\"AAAAAA\"",
        "explanation": "Production dipped in 2015 and 2016 as a result of overproduction and a collapse in oil prices, but recovered quickly once supply stabilized and prices increased, just as Trump was coming into office.",
        "source": "Politifact",
        "time": 6,
        "conclusion": "Not the Full Story",
    },
    3: {
        "active": false,
        "quote": "\"asdf ashed a revolution in American Energy -- the United States is now the number one producer of oil and natural gas in the world.\"",
        "explanation": "Production dipped in 2015 and 2016 as a result of overproduction and a collapse in oil prices, but recovered quickly once supply stabilized and prices increased, just as Trump was coming into office.",
        "source": "Politifact",
        "time": 7,
        "conclusion": "Not the Full Story",
    },
    4: {
        "active": false,
        "quote": "\"asdf ashed a revolution in American Energy -- the United States is now the number one producer of oil and natural gas in the world.\"",
        "explanation": "Production dipped in 2015 and 2016 as a result of overproduction and a collapse in oil prices, but recovered quickly once supply stabilized and prices increased, just as Trump was coming into office.",
        "source": "Politifact",
        "time": 8,
        "conclusion": "Not the Full Story",
    },
    5: {
        "active": false,
        "quote": "\"asdf ashed a revolution in American Energy -- the United States is now the number one producer of oil and natural gas in the world.\"",
        "explanation": "Production dipped in 2015 and 2016 as a result of overproduction and a collapse in oil prices, but recovered quickly once supply stabilized and prices increased, just as Trump was coming into office.",
        "source": "Politifact",
        "time": 17,
        "conclusion": "Not the Full Story",
    }
};


var App = {
    currentSession: null,
 
    init: function() {
        this.bindPathChange();
        this.newPath();
    },

    bindPathChange: function() {
        window.addEventListener("spfdone", this.newPath.bind(this)); // new youtube design    

        window.addEventListener("yt-navigate-finish", this.newPath.bind(this)); // new youtube design    

        // window.onhashchange = this.newPath.bind(this)
    },

    newPath: function() {
        youtube_id = youtube_parser(location.href);

        console.log(`New Video: ${youtube_id}`);

        // Send youtube ID to background script to make requests to techcheck central
        // This is required because we cannot make requests to http within youtube's https
        chrome.runtime.sendMessage({greeting: youtube_id}, function(response) {
            this.newSession(response.data);
            console.log("object: %O", response.data);
        }.bind(this));
    },

    newSession: function(data) {
        console.log("New Session");

        if(this.currentSession)
            this.currentSession.clear();

        if(data)
            this.currentSession = Session.init(data);
        else 
            this.currentSession = null;
    }
}

var Session = {
    init: function(data) {
        this.cards = data;
        this.onDeck = [];
        // this.player = null;
        this.initUIComponents();
        this.checkPlayerExists();

        return this;
    },

    clear: function() {
        for (var x in this.components) {
            if(components[x])
                components[x].remove();
        }
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
        }
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
        var defaultPlayer = document.getElementById('ytd-player');
        this.player = document.querySelector('video');
        
        components = this.components;

        defaultPlayer.children[0].children[0].appendChild(components.cardContainer);
        defaultPlayer.children[0].children[0].appendChild(components.openHistoryButton);
        defaultPlayer.children[0].children[0].appendChild(components.sidebar);
        components.cardContainer.appendChild(components.hiddenCards);
        components.cardContainer.appendChild(components.placeholder);
        components.sidebar.appendChild(components.historyContainer);

        components.openHistoryButton.addEventListener('click', function(){
            components.sidebar.style.width ='20%';
            components.openHistoryButton.style.opacity = '0';
        });

        document.getElementById("closeHistory").addEventListener('click', function() {
            components.sidebar.style.width ='0';
            components.openHistoryButton.style.opacity = '1';
        });


        this.player.ontimeupdate = this.onTimeUpdate.bind(this);
    },

    onTimeUpdate: function() {
        components = this.components;
        
        for(var id in this.cards) {
            var card = this.cards[id]

            if(card[0]["active"]==false
                && card[0]["time"]<=this.player.currentTime && this.player.currentTime<=card[0]["time"]+5) {

                var p = generateCardHTML(id, card);
                components.cardContainer.insertBefore(p, components.placeholder);
                components.cardContainer.scrollTop = components.hiddenCards.scrollHeight;
                setUpCollapsible(document.getElementById("collapsible-" + id), id);
                
                this.cards[id]["active"] = true;
                this.cards[id]["node"] = p;
                this.cards[id]["interval"] =  this.move(id);

                this.onDeck.push(p)
            }
        }
    },

    move: function(card_id) {
        components = this.components;

        var elem = document.getElementById("progress-" + card_id); 
        var width = 1;
        var id = setInterval(frame.bind(this), 10);

        // that = this;

        function frame() {
          if (width >= 100) {
            clearInterval(id);
            
            var node = this.cards[card_id]['node'];

            if(node)
                var clone = node.cloneNode(true);
            else
                return;
            // node.classList.remove("fadeIn");
            
            components.cardContainer.removeChild(node);
            components.historyContainer.appendChild(node);
            components.hiddenCards.appendChild(clone);
            fadeOut(clone);
    
            scrollTo(components.cardContainer, components.hiddenCards.scrollHeight + 15, 250);
          } else {
            width += .05; 
            // width += 0.2;
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

        

// var liveBadge = document.querySelector('.ytp-live-badge');
// var live = liveBadge && !liveBadge.getAttribute('disabled');
// console.log(live);


















