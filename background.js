var example = {
    0: {
        "active": false,
        "quote": "\"We have unleashed a revolution in American Energy -- the United States is now the number one producer of oil and natural gas in the world.\"",
        "explanation": "Production dipped in 2015 and 2016 as a result of overproduction and a collapse in oil prices, but recovered quickly once supply stabilized and prices increased, just as Trump was coming into office.",
        "source": "Politifact",
        "time": 5,
        "conclusion": "Not the Full Story",
    }
}

var url = "http://techcheck-central.icheckuclaim.org"

function process_results(data, last_update, callback) {
    // Get most recent run
    max_date_index = 0;
    max_date = null;
    data.forEach(function (element, i) {
        date = element['when_auto_ended'];
        if(max_date==null || date<max_date) {
            max_date = date;
            max_date_index = i;
        }
    });

    sid = data[max_date_index]['sid']

    // Make request with most recent SID
    var r = new XMLHttpRequest();

    var matchesURL = `${url}/api/matches/show?sid=${sid}&details=1`;

    if(last_update)
        matchesURL += `&when_created_after=${last_update}`

    r.open('GET', matchesURL);
    r.onload = function() {
        // Begin accessing JSON data here
        var data = JSON.parse(this.response);
        var pos = data['pos'];
        quoteToCard = {};
        cards = {};
        pos.forEach(element => {

            // console.log(element);
            key = element['text_details']['tid'];

            if (key in cards)
                temp = cards[key];
            else {
                temp = {}
                temp['explaination'] = [];
                temp['source'] = [];
                temp['conclusion'] = [];
            }
                

            temp['active'] = false;
            
            temp['explaination'].push(element['factcheck_details']['article_url']) ;
            temp['source'].push(element['factcheck_details']['organization_name']);
            temp['conclusion'].push(element['factcheck_details']['rating']);

            temp['quote'] = element['text_details']['text'];
            temp['time'] = element['text_details']['begins'];

            cards[key] = temp;
        })

        callback({"cards": cards, "timestamp": data["current_timestamp"]});
    }
    r.send();
}


chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.greeting) {
            var r = new XMLHttpRequest()
            r.open('GET', `${url}/api/streams/find?youtube_id=${request.greeting["id"]}`, true)
            
            r.onload = function() {
                // Begin accessing JSON data here
                var data = JSON.parse(this.response)

                // YouTube ID not found
                if(data.length==0) {
                    sendResponse({data: null});
                    return;
                }
                
                // YouTube ID found
                process_results(data, request.greeting["last_update"], function(fact_checks) {
                    sendResponse({data: fact_checks});
                    return;
                });
                
            }

            r.send()
        }
        
        // return true for ASYNC 
        return true;
    }
);