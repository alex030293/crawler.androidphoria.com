var Parse = require('parse/node').Parse,
    parse_config = require('./../config/parse'),
    http = require('http'),
    parseString = require('xml2js').parseString;

Parse.initialize(parse_config.appId, parse_config.jsKey, parse_config.masterKey);

function _save_post(post){
    var promise = new Parse.Promise();

    var post_title = post.title[0];
    console.log("PUBDATE: " + post.pubDate);
    var post_img = post['content:encoded'].toString().substring(post['content:encoded'].toString().indexOf('src="')+5, post['content:encoded'].toString().indexOf('class="attachment-thumbnail wp-post-image"')-2)
    //console.log(post_title + "   -   "+post_img);

    //Check if post exist
    var _post_header = Parse.Object.extend("Post_Header");
    var query = new Parse.Query(_post_header);
    query.equalTo('creator', post['dc:creator'][0]);
    query.equalTo("pubDate", new Date(post.pubDate));
    query.find({
        success: function(results) {
            //Post not duplicated
            if(results.length === 0){
                //Save post header
                var Post_Header = Parse.Object.extend("Post_Header");
                var post_header = new Post_Header();

                post_header.set("title", post_title);
                post_header.set("img", post_img);
                post_header.set('pubDate', new Date(post['pubDate'][0]));

                post_header.save(null, {
                    success: function(res) {
                        console.log('[NFO]  Post headers saved: ' + post_title);
                        //Save post contents
                        var Post = Parse.Object.extend("Post");
                        var p = new Post();

                        p.set('title', post_title);
                        p.set('img', post_img);
                        p.set('category', post.category[0]);
                        p.set('content', post['content:encoded'][0]);
                        p.set('creator', post['dc:creator'][0]);
                        p.set('description', post['description'][0]);
                        p.set('link', post['link'][0]);
                        p.set('pubDate', new Date(post['pubDate'][0]));

                        p.save(null, {
                            success: function(r){
                                console.log(r);
                                promise.resolve(true);
                            },
                            error: function(r, e){

                                console.log(e);
                                promise.resolve(false);
                            }
                        });
                    },
                    error: function(r, e) {
                        console.log(e);
                        promise.resolve(false);
                    }
                });
            }else{
                //Post duplicatedd
                console.log("[NFO]  Duplicated post: " + post_title);
            }
        },
        error: function(error) {
            console.log("Error: " + error.code + " " + error.message);
            promise.resolve(false);
        }
    });

    return promise;
}

function _update_posts(){
    //Get posts
    var options = {
        host: 'androidphoria.com',
        path: '/feed'
    };

    http.request(options, function(response) {
        var str = '';

        //another chunk of data has been recieved, so append it to `str`
        response.on('data', function (chunk) {
            str += chunk;
        });

        //the whole response has been recieved, so we just print it out here
        response.on('end', function () {
            parseString(str, function (err, result) {
                var channel = result.rss.channel[0];
                var posts_array = channel.item;

                for(var i = 0; i < posts_array.length; i++){
                    var post = posts_array[i];
                    _save_post(post).then(function(r){
                        console.log('resolved');
                    });
                }
            });

        });
    }).end();

}

module.exports.update_posts = _update_posts;
