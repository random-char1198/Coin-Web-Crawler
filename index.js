// basic config
var express = require('express');
const path = require('path')
var elasticlunr = require('elasticlunr')
const { Matrix } = require('ml-matrix');
var app = express();
app.use(express.json());

var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";

// set config
app.set('views', path.join(__dirname,'views'))
app.engine('.html', require('ejs').__express);
app.set('view engine', 'html');
app.use(express.static('public'));


// set index config
let search = elasticlunr()

// set personal search config
let personalSearch = elasticlunr()

// total len
var len = 1000


// fruit inlink dict
var fruit_inlink_dict = {}



// requests util
var Crawler = require("crawler");

// parse html util
var cheerio = require("cheerio")

// base uri
var baseUri = "https://people.scs.carleton.ca/~davidmckenney/fruitgraph/"

// begin html
app.get('/',(req,res)=>{
    // init page rank score
    res.render('render2')
})

// rest api
app.get('/send', function (req, res) {
    res.send('Hello World');
});

// get popular
app.get('/popular', function (req, res){
    get_data(req, res);
})


// crawl_all_page
app.get('/crawl', function (req, res){
    crawl(req, res);
})


// find single
app.get('/popular/:index', async function (req, res,next){

    popular_index(req, res);

})

// pageX
// app.get('/:pageX', async function (req, res){
//     pageX(req, res);
// })
app.param("pageX", function(req, res, next){
    let pageNum = req.params.pageX
    console.log("pageX")
    if(!isNaN(pageNum)){
        //If it's a number
        next()

    }
    else{
        res.status(400).send("Input Page Number TYPE IS WRONG, please enter a number instead")
    }

})
// pageX
app.get('/page/:pageX', async function (req, res){
    pageX(req, res);
})


// search api
app.post('/search', function (req, res){
    search_function(req, res)
})


// page rank api
// app.get('/pageRank', function (req, res){
//     page_rank_function(req, res)
// })


// coin market part

// crawl coin data
app.get('/crawlCoin', function (req, res){
    crawlCoin(req, res)
})


// search fruit


// search personal
app.post("/personal", function (req, res){
    personal(req, res)
})


app.post("/fruit", function (req, res){
    fruit(req, res)
})

// global dict
var personalPageRank = {}

// fruit dict
var fruitPageRank = {}


// start server
var server = app.listen(8081, function () {
    // set index
    index_function()
    // set personal index
    index_personal_function()

    // init fruit inlink
    fruit_inlink()

    // config
    var host = server.address().address;
    var port = server.address().port;
    server.setTimeout(5000);
    console.log("application, server address, http://%s:%s", host, port)

    // fruit page rank function
    page_rank_function()
    // personPageRank init
    page_rank_to_personal_function()

    // init database
    try{
        init_database()
    }catch (e) {
        console.log("finish init")
    }
});

// database - mongodb

// init database
function init_database() {
    try{
        MongoClient.connect(url, function (err, db) {
            // if (err) throw err;
            var dbase = db.db("spiderDB");
            dbase.createCollection('info', function (err, res) {
                // if (err) throw err;
                db.close();
            });
        });
    }catch (e){

    }
}

// insert data to mongo
function insert_data(data){
    MongoClient.connect(url).then((conn) => {
        const info = conn.db("spiderDB").collection('info');
        info.insertOne(data).then((res)=>{

        });
    })
}

// insert data to coinDB
function insert_data_to_coinDB(data){
    MongoClient.connect(url).then((conn) => {
        const info = conn.db("coinDB").collection('info');
        info.insertOne(data).then((res)=>{

        });
    })
}

// get data from mongo
function get_data(req, res){
    MongoClient.connect(url).then((conn) => {
        const info = conn.db("spiderDB").collection('info');

        let topList = []
        let topListInCome = []
        // outcome
        // info.find().sort({"number": -1}).limit(10).toArray().then((arr) => {
        //     // console.log("data:");
        //     // console.log(arr);
        //     for (let i = 0; i < arr.length; i++) {
        //         let tmp = {}
        //         tmp["curUri"] = arr[i].curUri
        //         tmp["number"] = arr[i].number
        //         tmp["title"] = arr[i].title
        //         topList.push(tmp)
        //     }
        //     return res.json({"topList": topList})
        //
        // })

        let compare = function (prop) {
         return function (obj1, obj2) {
         let val1 = obj1[prop];
         let val2 = obj2[prop];
         if (val1 < val2) {
          return 1;
         } else if (val1 > val2) {
          return -1;
         } else {
          return 0;
         }
         }
        }
        //https://dmitripavlutin.com/how-to-compare-objects-in-javascript/

        // income link
        info.find().toArray().then((arr) => {
            let tmp_table = []

            for(let i=0;i<1000;i++){
                let tmp_dict = {"cur": 1, "cnt": 0}
                tmp_table.push(tmp_dict)
            }

            for(let i=0;i<arr.length;i++){
                let tmp_list = arr[i].subPage
                for(let j=0;j<tmp_list.length;j++){
                    let sub = tmp_list[j].replace(".html", "").replace("https://people.scs.carleton.ca/~davidmckenney/fruitgraph/N-","")
                    tmp_table[sub].cur = parseInt(sub)
                    tmp_table[sub].cnt += 1
                    // console.log('tt', tmp_table[sub])
                }
            }

            // console.log('t', tmp_table)

            tmp_table.sort(compare('cnt'))

            for(let j=0;j<10;j++){
                let tmp = {}
                tmp["curUri"] = "https://people.scs.carleton.ca/~davidmckenney/fruitgraph/N-" + tmp_table[j].cur + ".html"
                tmp["number"] = tmp_table[j].cnt
                tmp["title"] = tmp_table[j].cur
                topList.push(tmp)
            }

            // console.log("top len1，" + topList.length)
            return res.json({"topList": topList})

        })

    })
}


// spider function

// crawl all data
function crawl(req, res){
    // visited page
    let visitPage = {}

    // queue spider
    var queue = []
    var cnt = 1
    let beginUrl = "https://people.scs.carleton.ca/~davidmckenney/fruitgraph/N-0.html"

    // init spider
    let spider = new Crawler({
        encoding: null,
        jQuery: false,// set false to suppress warning message.
        callback: function(err, res, done){
            if(err){
                console.error(err.stack);
            }else{
                // deal with html info
                let curUri = res.request.uri
                let body = res.body
                let $ = cheerio.load(body)
                let a_list = $('a')
                let nextUriList = []

                // page body
                let content = $('p').text().trim().toString().replace(/\n/g, " ")
                // console.log(content)

                // add list sub page link
                for (let i = 0; i < a_list.length; i++) {
                    let a_item = a_list.eq(i)
                    let nextUri = a_item.text().trim()
                    let tmp = baseUri + nextUri + ".html"
                    // adjust visited
                    if ( ! (tmp in visitPage) ) {
                        queue.push(tmp)
                        cnt += 1
                    }
                    // add sub page
                    nextUriList.push(tmp);
                }

                // count sub link number
                let number = nextUriList.length

                // save info
                insert_data({"title": curUri.href.replace(baseUri,"").replace(".html", ""), "curUri": curUri.href , "content": content , "subPage": nextUriList ,  "number": number })

                // console.log('remain queue:' + queue.length)

                while (queue.length > 0) {
                    let nextUri = queue.pop();
                    console.log('nextUri:' + nextUri)
                    // add visited page
                    visitPage[nextUri] = 1;
                    // begin to crawl
                    spider.queue({
                        uri: nextUri
                    });
                }

                console.log('total:' + cnt)

            }
            done();
        }
    });

    // begin to crawl
    visitPage[beginUrl] = 1;
    spider.queue({
        uri: beginUrl
    });

    // return res.send("finish crawl.")
    return res.json({"msg": "crawling"})
}

async function popular_index(req, res){
    let index = req.params.index
    let conn = await MongoClient.connect(url)
    const info = conn.db("spiderDB").collection('info');
    if(index >= 0 && index <=9){
        let arr = await info.find().sort({number: -1}).limit(10).toArray()
        let data = arr[index]
        let content = data.content
        let subPage = data.subPage
        return res.status(302).json({"content": content, "subPage": subPage})
    }
    else{
        return res.status(404).send("BAD REQUEST")

    }
}

async function pageX(req, res){
    let pageX = req.params.pageX
    let conn = await MongoClient.connect(url)
    try {
        // console.log("=================")
        // console.log("N-"+pageX)
        const info = conn.db("spiderDB").collection('info');

        let data = await info.findOne({"title": "N-"+pageX})
        let content = data.content
        let subPage = data.subPage
        return res.json({"content": content, "subPage": subPage})
    } catch (e){
        res.json({"code": 500})
    }
}

// index function
function index_function(req, res){
    search.addField('title');
    search.addField('curUri');
    search.addField('content');
    search.addField('subPage');
    search.addField('id');

    // find mongo data
    MongoClient.connect(url).then((conn) => {
        const info = conn.db("spiderDB").collection('info');
        info.find().toArray().then((arr) => {
            for (let i = 0; i < arr.length; i++) {
                search.addDoc(
                    {
                        "title": arr[i].title,
                        "curUri": arr[i].curUri,
                        "content": arr[i].content,
                        "outlink": arr[i].subPage,
                        "id": i,
                    }
                );
            }
        })
    })
    console.log("finish index...")
}


// fruit inlink
function fruit_inlink(){

    // fruit inlink

    MongoClient.connect(url).then((conn) => {
        const info = conn.db("spiderDB").collection('info');
        info.find().toArray().then((arr) => {
                let tmpLink = {}
                for (let i = 0; i < len; i++) {
                    let cur = arr[i].title.replace("N-", "")
                    let subList = arr[i].subPage
                    // https://people.scs.carleton.ca/~davidmckenney/fruitgraph/N-
                    // .html
                    for (let j = 0; j < subList.length; j++) {
                        let sub = subList[j].replace(".html", "").replace("https://people.scs.carleton.ca/~davidmckenney/fruitgraph/N-", "")
                        let tmpCur = "https://people.scs.carleton.ca/~davidmckenney/fruitgraph/N-" + cur + ".html"
                        if ( !(sub.toString() in tmpLink) ){
                            tmpLink["N-" + sub.toString()] = [ tmpCur ]
                        }else{
                            tmpLink["N-" + sub.toString()].push(tmpCur)
                        }
                    }
                }

                // convert val to dict
                fruit_inlink_dict = tmpLink;
        })

    })


}


// set personal index function
function index_personal_function(){
    personalSearch.addField('title');
    personalSearch.addField('curUri');
    personalSearch.addField('content');
    personalSearch.addField('id');
    personalSearch.addField('inlink')
    personalSearch.addField('outlink')

    // find mongo data
    MongoClient.connect(url).then((conn) => {
        const info = conn.db("coinDB").collection('info');
        info.find().toArray().then((arr) => {
            for (let i = 0; i < arr.length; i++) {
                personalSearch.addDoc(
                    {
                        "inlink": arr[i].inlink,
                        "outlink": arr[i].outlink,
                        "title": arr[i].title,
                        "curUri": arr[i].curUri,
                        "content": arr[i].content,
                        "id": i,
                    }
                );
            }
        })
    })
    console.log("finish index...")

}


// search function
function search_function(req, res){

    try{
        console.log("searching...")

        // json format keyword
        let word = req.body.word

        console.log("word:" + word)

        // search result
        let dataRes = search.search( word,
                {
                    boolean: "OR",
                    "content": {boost: 1},
                    "curUri": {boost: 2},
                    "title": {boost: 3},
                }
            )
        // showData
        let data = []

        // adjust length
        // chose top 10
        for (let index=0; index<10; index++){
            let refId = dataRes[index].ref
            let row = search.documentStore.docs[refId]
            row['score'] = dataRes[index].score
            data.push(row)
        }
        res.json({"code": 200, "data": data})

    }catch (e){
        res.json({"code": 500})
    }

}

// page rank function
function page_rank_function(){
    // try{
        console.log("pageRank...")

        // return final result
        let data;

        // init matrix A
        let A = Matrix.zeros(len, len)

        // reade mongo data
        MongoClient.connect(url).then((conn) => {
        const info = conn.db("spiderDB").collection('info');
        info.find().toArray().then((arr) => {
                for (let i = 0; i < len; i++) {
                    let cur = arr[i].title.replace("N-", "")
                    let subList = arr[i].subPage
                    // https://people.scs.carleton.ca/~davidmckenney/fruitgraph/N-
                    // .html
                    for(let j=0; j<subList.length; j++){
                        let sub = subList[j].replace(".html", "").replace("https://people.scs.carleton.ca/~davidmckenney/fruitgraph/N-","")
                        A.data[ parseInt(sub) ][ parseInt(cur) ] = 1
                    }
                }

                A = tran_and_convert(A, len)

                console.log('A', A)

                // convert link to node
                let rank = page_rank(A, len)

                let tmp = []

                console.log(rank)

                // add page page
                for(let i=0;i<1000;i++){
                    tmp.push( [rank.data[i][0], i] )
                }

                tmp.sort(function (a, b){
                    return b[0] - a[0]
                })

                console.log(tmp)

                let out = {}

                // out info
                for(let i=0; i<tmp.length; i++){
                    out[tmp[i][1]] = tmp[i][0]
                }

                fruitPageRank = out

                // res.json({"code": 200, "data": out})

                // console.log('top 25 rank.')
                // console.log(out)

            })
        })

        // res.send("check result in console.")

    // }catch (e){
    //     res.json({"code": 500, "msg": "server error"})
    // }
}


// page rank function
function page_rank_to_personal_function(){
    // try{
        // init matrix A
        let ALen = 630
        let A = Matrix.zeros(ALen, ALen)

        let titleMapNumber = {}
        let NumberMapTitle = {}

        // reade mongo data
        MongoClient.connect(url).then((conn) => {
        const info = conn.db("coinDB").collection('info');
        info.find().toArray().then(async (arr) => {
            // title map to number
            for (let i=0; i < arr.length; i++){
                titleMapNumber[ arr[i].title ] = i
                NumberMapTitle[ i ] = arr[i].title
            }

            for (let i = 0; i < ALen; i++) {
                let cur = arr[i].title
                let subList = arr[i].outlink
                // https://people.scs.carleton.ca/~davidmckenney/fruitgraph/N-
                // .html
                for(let j=0; j<subList.length; j++){
                    let sub = subList[j]
                    A.data[ titleMapNumber[sub] ][ titleMapNumber[cur] ] = 1
                }
            }

            // A = Matrix.zeros(ALen, ALen)
            A = tran_and_convert(A, 630)

            console.log("=======A=======")
            // console.log(A)
            console.log("=======A=======")

            // convert link to node
            let rank = page_rank(A, 630)

            let tmp = []

            // console.log(rank)

            // add page page
            for(let i=0;i<ALen;i++){
                tmp.push( [rank.data[i][0], i] )
            }

            tmp.sort(function (a, b){
                return b[0] - a[0]
            })

            // console.log(tmp)

            let pageMapScore = {}

            for(let i=0;i<tmp.length;i++){
                // key -> title
                // val -> score
                pageMapScore[ tmp[i][1] ] = tmp[i][0]
            }

            personalPageRank = pageMapScore

            })
        })

        // res.send("check result in console.")

    // }catch (e){
    //     res.json({"code": 500, "msg": "server error"})
    // }
}


// matrix module
// convert matrix to probability matrix
function tran_and_convert(matrix, len){
    // init 1000 * 1000 matrix
    // let len = 1000;
    // console.log(len)
    // let len = 630
    let result = Matrix.zeros(len, len)
    let result_convert = Matrix.zeros(len, len)
    for(let i=0; i<len; i++){
        let sum = 0
        for (let k=0; k<len; k++){
            // console.log(matrix.data[i][k])
            sum += matrix.data[i][k]
        }
        for(let j=0; j<len; j++){
            // cal average
            result.data[i][j] = (matrix.data[i][j] * 1.0) / sum
        }
    }
    for(let i=0; i<len; i++){
        for(let j=0; j<len; j++){
            if (!isNaN(result.data[j][i])){
                result_convert.data[i][j] = result.data[j][i]
            }else{
                result_convert.data[i][j] = 0
            }
        }
    }
    return result_convert
}

// cal pageRank rate
function page_rank(A, len){
    let pageNum = len;
    let alpha = 0.1
    let delta = 0.0001
    let norm = 100

    let new_rank = Matrix.zeros(pageNum, 1)

    for(let i=0; i<pageNum; i++){
        new_rank.data[i][0] = [0.1]
    }

    let r = Matrix.zeros(pageNum,1)

    for(let i=0; i<pageNum; i++){
        r.data[i][0] = [alpha / pageNum]//sync
    }

    // console.log('r', r)
    // console.log('new_rank', new_rank)

    let rank = Matrix.zeros(pageNum,1)

    // console.log('A', A)

    while(norm > delta){
        rank = new_rank
        // console.log('rank', rank)
        let cal1 = A.mmul(rank)
        // console.log('cal1', cal1)
        let cal2 = Matrix.mul(cal1, 1-alpha)
        // console.log('cal2', cal2)
        new_rank = Matrix.add(r, cal2)
        // console.log('new_rank', new_rank)
        // console.log('r2' , r)
        // compare norm
        norm = 0
        for(let i=0; i<pageNum; i++){
            // console.log(new_rank.data[0][i] + "-" + rank.data[0][i])
            norm += Math.abs(new_rank.data[i][0] - rank.data[i][0])
        }
        // console.log('norm.' + norm)
        // console.log('norm.' + norm)
    }
    console.log('rank', new_rank)
    return new_rank
}


// crawl coin function
async function crawlCoin(req, res){

    // visited page
    let visitPage = {}

    // queue spider
    let queue = []
    let cnt = 1
    let beginUrl = "https://coinmarketcap.com/currencies/bitcoin/"
    let baseUri = "https://coinmarketcap.com/"

    //div[@class="sc-16r8icm-0 kjciSH contentClosed hasShadow"]

    console.log("begin coin crawl.")

    // init spider
    let spider = new Crawler({
        encoding: null,
        jQuery: false,// set false to suppress warning message.
        callback: async function(err, res, done){
            if(err){
                console.error(err.stack);
            }else{
                // deal with html info
                let curUri = res.request.uri
                let body = res.body
                let $ = cheerio.load(body)

                let title = $('h2').attr("class", "sc-1q9q90x-0 jCInrl h1").text().trim()
                // page body
                let content = $('div').attr("class", "sc-16r8icm-0 kjciSH contentClosed hasShadow").text().trim()

                let a_list = $('div').attr("class", "sc-12jeznp-2 ejNZLB").children("p").attr("href")
                let nextUriList = []

                // add list sub page link
                for (let i = 0; i < a_list.length; i++) {
                    let a_item = a_list.eq(i)
                    let nextUri = a_item.text().trim()
                    // let tmp = baseUri + nextUri
                    let tmp = nextUri
                    // adjust visited
                    if ( ! (tmp in visitPage) ) {
                        queue.push(tmp)
                        cnt += 1
                    }
                    // add sub page
                    nextUriList.push(tmp);
                }

                // save info
                insert_data_to_coinDB(
                    {
                        "curUri": curUri,
                        "title": title,
                        "content": content,
                        "outlink": nextUriList
                    }
                )

                // console.log('remain queue:' + queue.length)

                while (queue.length > 0  && cnt < 630) {
                    let nextUri = queue.pop();
                    console.log('nextUri:' + nextUri)
                    // add visited page
                    visitPage[nextUri] = 1;
                    // begin to crawl
                    await spider.queue({
                        uri: nextUri,
                        // proxy: "https://192.168.0.26:5890",
                        keepAlice: false
                    });
                }

                // wait
                let d = 60;
                for(var t = Date.now(); Date.now() - t <= d;);

                console.log('total:' + cnt)

            }
            done();
        }
    });

    // begin to crawl
    visitPage[beginUrl] = 1;
    await spider.queue({
        uri: beginUrl,
        // proxy: "https://192.168.0.26:5890",
        keepAlice: false
    });


    // until enough visitPage
    // inDict[ from ] = inlink
    let inDict = {}

    // let baseUri = "https://coinmarketcap.com/"

    // read all data
    MongoClient.connect(url).then((conn) => {
        const info = conn.db("coinDB").collection('info');
        info.find().toArray().then((arr) => {
            for(let i=0;i<arr.length; i++){
                for(let j=0; j<arr[i]["outlink"].length; j++){
                    if ( inDict[ arr[i]["outlink"][j] ].length === 0 ){
                        inDict[ arr[i]["outlink"][j] ] = [ arr[i].title ]
                    }else{
                        inDict[ arr[i]["outlink"][j] ].push( arr[i].title )
                    }
                }
            }



        })
        // res.json({"msg":"Finish Crawling"})
    })

    res.json({"msg":"crawling"})

}


// search personal
function personal(req, res){

    let q = req.body.q
    let boost = req.body.boost
    let limit = req.body.limit

    query_function(q, limit, boost, req, res)

}

// search fruit
function fruit(req, res){

    let q = req.body.q
    let boost = req.body.boost
    let limit = req.body.limit

    query_function_fruit(q, limit, boost, req, res)

}


// query function
function query_function(query, myLimit, boostInfo, req, res){
    // try{

        let limit = parseInt(myLimit)

        if (limit === ""){
            limit = 10
        }

        if (limit < 1 || limit > 50){
            return res.json({"code": 500})
        }

        console.log("searching...")
        let dataRes = []
        // search result
        if (boostInfo === "true") {
            dataRes = personalSearch.search( query,
                {
                    boolean: "OR",
                    "curUri": {boost: 1},
                    "title": {boost: 2},
                    "content": {boost: 3},
                }
            )
            let data = []

            // get page rank score
            for(let index=0; index<dataRes.length; index++){
                let refId = dataRes[index].ref
                let row = personalSearch.documentStore.docs[refId]


                row['score'] = dataRes[index].score
                row["pageRankScore"] = personalPageRank[ row.id ]
                if( row["pageRankScore"] === undefined ){
                    continue
                }
                row["score_pageScore"] = row['score'] * row["pageRankScore"]

                // count word freq
                row = get_wd(row)

                data.push(row)
            }

            // order by pageRankScore
            data.sort(function (a, b){
                return b.score_pageScore - a.score_pageScore
            })

            // return result

            res.json({"code": 200, "data": data})

        }else {
            dataRes = personalSearch.search( query,
                {
                    boolean: "OR",
                    "curUri": {boost: 1},
                    "title": {boost: 2},
                    "content": {boost: 3},
                }
            )

            // showData
            let data = []

            // adjust length
            if (dataRes.length >= limit){
            } else {
                limit = dataRes.length
            }

            for (let index=0; index<limit; index++){
                let refId = dataRes[index].ref
                let row = personalSearch.documentStore.docs[refId]


                row['score'] = dataRes[index].score
                row["pageRankScore"] = personalPageRank[ row.id ]
                if( row["pageRankScore"] === undefined ){
                    continue
                }

                // count word freq
                row = get_wd(row)

                data.push(row)
            }

            res.json({"code": 200, "data": data})
        }


    // }catch (e){
    //     res.json({"code": 500})
    // }

}



// query function
function query_function_fruit(query, myLimit, boostInfo, req, res){
    // try{

        let limit = parseInt(myLimit)

        if (limit === ""){
            limit = 10
        }

        if (limit < 1 || limit > 50){
            return res.json({"code": 500})
        }

        console.log("searching...")
        let dataRes = []
        // search result
        if (boostInfo === "true") {
            dataRes = personalSearch.search( query,
                {
                    boolean: "OR",
                    "curUri": {boost: 1},
                    "title": {boost: 2},
                    "content": {boost: 3},
                }
            )
            let data = []

            // get page rank score
            for(let index=0; index<dataRes.length; index++){
                let refId = dataRes[index].ref
                let row = search.documentStore.docs[refId]


                row['score'] = dataRes[index].score
                row["pageRankScore"] = personalPageRank[ row["title"].replace("N-", "") ]
                if( row["pageRankScore"] === undefined ){
                    continue
                }

                row["score_pageScore"] = row['score'] * row["pageRankScore"]

                // count word freq
                row = get_wd(row)

                // fruit inlink
                row['inlink'] = fruit_inlink_dict[ row["title"] ]

                data.push(row)
            }

            // order by pageRankScore
            data.sort(function (a, b){
                return b.score_pageScore - a.score_pageScore
            })

            // return result


            res.json({"code": 200, "data": data})

        }else {
            dataRes = search.search( query,
                {
                    boolean: "OR",
                    "curUri": {boost: 1},
                    "title": {boost: 2},
                    "content": {boost: 3},
                }
            )

            // showData
            let data = []


            // adjust length
            if (dataRes.length >= limit){
            } else {
                limit = dataRes.length
            }

            for (let index=0; index<limit; index++){
                let refId = dataRes[index].ref
                let row = search.documentStore.docs[refId]
                row['score'] = dataRes[index].score


                row["pageRankScore"] = personalPageRank[ row["title"].replace("N-", "") ]
                if( row["pageRankScore"] === undefined ){
                    continue
                }

                // count word freq
                row = get_wd(row)

                // fruit inlink
                row['inlink'] = fruit_inlink_dict[ row["title"] ]

                data.push(row)
            }



            res.json({"code": 200, "data": data})
        }


    // }catch (e){
    //     res.json({"code": 500})
    // }

}


function get_wd(row){
    let wd = {}
    let word_list = row["content"].split(" ")
    for(let i=0;i<word_list.length;i++){
        if(word_list[i] in wd){
            wd[word_list[i] ] += 1;
        }else{
            wd[word_list[i] ] = 1;
        }
    }

    let items = Object.keys(wd).map(function (key){
        return [key, wd[key]]
    })

    // sort word freq
    items.sort(function(first, second){
        return second[1]  -  first[1];
    });

    row["wd"] = items
    return row
}

