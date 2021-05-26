/**
 * This script creates new CDN custom events used for Entity Synthesis
 *     from SyntheticRequest URL's that contain the string 'cdn'.
 * 
 *     This script must be placed in a Synthetic API Test Monitor
 *     to work properly and there must be existing SyntheticRequests.
 * 
 *     It can easily be extended to Browser and Mobile requests.
 *     
 *     The api test monitor can be run at any frequency, but the MONITOR_FREQUENCY_IN_MINUTES
 *     variable below must be set to the same frequency so that duplicates do not
 *     occur. (This logic can be made more robust in future iterations.)
 */

// ------MODIFY THE FOLLOWING VARIABLES--------
const QUERY_KEY = `{{QUERY_KEY}}`;
const INSERT_KEY = `{{INGEST_KEY}}`;
const ACCOUNT_ID = '{{ACCOUNT_ID}}';
const MONITOR_FREQUENCY_IN_MINUTES = '5'; // This must match the monitor frequency
//----------------END-------------------------

const assert = require('assert');
const Q = require('q');


const getCDNRequests = function () {
  let deferred = Q.defer();
  // In the future, we could check for CDN requests made via the Browser or Mobile agents as well.
  // const NRQL_CDNs_via_SyntheticRequests = `SELECT * FROM SyntheticRequest WHERE url LIKE '%cdn%' LIMIT MAX`;
  const NRQL_CDNs_via_SyntheticRequests = "SELECT * FROM SyntheticRequest WHERE URL like '%cdn%' LIMIT MAX SINCE " + MONITOR_FREQUENCY_IN_MINUTES + " MINUTES AGO";
  // const nrqlQueryInGraphQL = `{ actor { account(id: ${ACCOUNT_ID}) { nrql(query: "${NRQL_CDNs_via_SyntheticRequests}") { results } }}}`;
  // const queryString = JSON.stringify({"query": nrqlQueryInGraphQL});
  const queryString = encodeURI(NRQL_CDNs_via_SyntheticRequests)
  const uri = 'https://insights-api.newrelic.com/v1/accounts/'+ACCOUNT_ID+'/query?nrql='+queryString;
  // console.log('uri: ', uri);
  const options = {
    //Define endpoint URI
    uri: uri,
    //Define query key and expected data type.
    headers: {
      'X-Query-Key': QUERY_KEY,
      'Accept': 'application/json',
    }
  };
  $http.get(options,
    // Callback
    function (err, response, body) {
      if (response.statusCode == 200) {
        deferred.resolve(body);
      } else {
        console.error('Expected a 200 response when querying events.', response.statusCode)
        deferred.reject(response);
      }
    }
  );
  return deferred.promise;
}

let resultArray = ''
const createCDNEvents = function(body) {
  let deferred = Q.defer();
  let cdnEvents = [];
  try {
    // console.log("attempting to parse body into JSON:", body);
    const json_body = JSON.parse(body)
    resultArray = json_body['results'][0]['events'];
    for (let i = 0; i < resultArray.length; i++) {
      const event = {
        eventType: 'CDN',
        cdn_url: resultArray[i]['URL'],
        domain: resultArray[i]['domain'],
        host: resultArray[i]['host'],
        duration: resultArray[i]['duration'],
        monitorName: resultArray[i]['monitorName'],
        responseBodySize: resultArray[i]['responseBodySize'],
        responseCode: resultArray[i]['responseCode']

      }
      cdnEvents.push(event);
    }
    deferred.resolve(cdnEvents);
  } catch (err) {
    console.error('Result array before createCDNEvents error', resultArray)
    deferred.reject(err);
  }
  return deferred.promise;
}

const postNewCDNRequests = function(cdnEvents) {
  let deferred = Q.defer();
  // console.log('cdnEvents', cdnEvents)
  const options = {
    //Define endpoint URL.
    url: "https://insights-collector.newrelic.com/v1/accounts/"+ACCOUNT_ID+"/events",
    //Define body of POST request.
    body: JSON.stringify(cdnEvents),
    //Define insert key and expected data type.
    headers: {
        'X-Insert-Key': INSERT_KEY,
        'Content-Type': 'application/json'
        }
  };
  $http.post(options,
    // Callback
    function (err, response, body) {
      if (response.statusCode == 200) {
        console.log('Successful post!')
        deferred.resolve(body);
      } else {
        console.error('Expected a 200 response when posting new event data', response.statusCode)
        deferred.reject(response);
      }
    }
  );
  return deferred.promise;
}

// Execute promise chain
getCDNRequests().then((body) => createCDNEvents(body)).then((cdnEvents) => postNewCDNRequests(cdnEvents));