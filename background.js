var example = {
    0: {
        "active": false,
        "quote": "\"We have unleashed a revolution in American Energy -- the United States is now the number one producer of oil and natural gas in the world.\"",
        "explaination": "Production dipped in 2015 and 2016 as a result of overproduction and a collapse in oil prices, but recovered quickly once supply stabilized and prices increased, just as Trump was coming into office.",
        "source": "Politifact",
        "time": 5,
        "conclusion": "Not the Full Story",
    }
}

function process_results(data, callback) {
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
    r.open('GET', `http://techcheck-central.icheckuclaim.org/api/matches/show?sid=${sid}&details=1`);
    r.onload = function() {
        // Begin accessing JSON data here
        var data = JSON.parse(this.response);
        var pos = data['pos'];

        cards = {};
        pos.forEach(element => {
            // console.log(element);
            temp = {};
            temp['active'] = false;
            
            temp['explaination'] = element['factcheck_details']['article_url'];
            temp['source'] = element['factcheck_details']['organization_name'];
            temp['conclusion'] = element['factcheck_details']['rating'];
            temp['quote'] = element['text_details']['text'];
            temp['time'] = element['text_details']['begins'];
           

            console.log(temp['time']);

            cards[element['fid']] = temp;
        })

        // console.log(cards);

        callback(cards);
    }
    r.send();
}


chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.greeting) {
            var r = new XMLHttpRequest()
            r.open('GET', `http://techcheck-central.icheckuclaim.org/api/streams/find?youtube_id=${request.greeting}`, true)
            
            r.onload = function() {
                // Begin accessing JSON data here
                var data = JSON.parse(this.response)
                
                // console.log(data);

                // YouTube ID not found
                if(data.length==0) {
                    sendResponse({data: null});
                    return;
                }
                
                // YouTube ID found
                process_results(data, function(fact_checks) {
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