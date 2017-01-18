var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var request = require('request');

mongoose.connect('mongodb://localhost:27017/moviereviews');
var Schema = mongoose.Schema;

var movieDataSchema = new Schema({
    title: {type: String, required: true},
    reviews: [{userName: String, review: String, replies: [{userName: String, reply: String}]}]
}, {collection: 'movie-data'});
var MovieData = mongoose.model('MovieData', movieDataSchema);

router.get('/', function (req, res, next) {
    MovieData.find(function (err, movies) {
        if (err) return console.error(err);

        parseMoviesInfo(res, movies);
    })
});

router.get('/movies', function (req, res, next) {
    MovieData.find()
        .then(function (doc) {
            res.render('list-movies', {items: doc});
        });
});

router.get('/movies/add', function (req, res, next) {
    res.render('add-movie', {title: 'Express'});
});

router.post('/add-movie', function (req, res, next) {
    var item = {
        title: req.body.title
    };

    var data = new MovieData(item);
    data.save();

    res.redirect('/movies');
});

router.get('/movies/edit/:id', function (req, res, next) {
    var id = req.params.id;

    MovieData.findById(id, function (err, doc) {
        if (err) {
            console.error('error, no entry found');
        }

        res.render('edit-movie', {id: id, title: doc.title});
    })
});

router.post('/movies/edit', function (req, res, next) {
    var id = req.body.id;

    MovieData.findById(id, function (err, movie) {
        if (err) {
            console.error('error, no entry found');
        }

        movie.title = req.body.title;
        movie.save();
    })

    res.redirect('/movies');
});

router.get('/movies/delete/:id', function (req, res, next) {
    var id = req.params.id;
    MovieData.findByIdAndRemove(id).exec();
    res.redirect('/movies');
});

router.get('/movies/:title', function (req, res, next) {
    var title = req.params.title;

    MovieData.findOne({title: title}, function (err, doc) {
        if (err) {
            console.error('error, no entry found');
        }

        parseJson(title, res, doc);

    });
});

router.post('/submit', function (req, res, next) {
    var review = {
        "userName": req.body.name,
        "review": req.body.review
    };

    MovieData.findOneAndUpdate(
        {_id: req.body.movie_id},
        {$push: {reviews: review}},
        {safe: true, upsert: true},
        function (err, model) {
            console.log(err);
        }
    );

    res.redirect('/movies/' + req.body.movie_title);
});

router.post('/submit-reply', function (req, res, next) {
    MovieData.update({'reviews._id': req.body.parent_review}, {
        $push: {
            "reviews.$.replies": {
                userName: req.body.name,
                reply: req.body.reply
            }
        }
    }, function (err, review) {
        console.log(review);
    })

    res.redirect('/movies/' + req.body.movie_title);
});

function parseMoviesInfo(res, movies) {
    var moviesInfo = [];

    var waiting = movies.length;

    for (var i = 0; i < movies.length; i++) {

        var requestUrl = 'http://www.omdbapi.com/?t=' + movies[i].title + '&plot=short&r=json';
        var result;
        request(requestUrl, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                // parse the json result
                result = JSON.parse(body);

                var currentMovie = [];

                for (var i in result) {
                    currentMovie[i] = result[i];
                }
                moviesInfo.push(currentMovie);

                if (--waiting == 0) callback(res, moviesInfo);
            } else {
                console.log(error, response.statusCode, body);
            }
        });

    }
}

function callback(res, moviesInfo) {
    res.render('index', {items: moviesInfo});
}

function parseJson(title, res, movieData) {
    var requestUrl = 'http://www.omdbapi.com/?t=' + title + '&plot=short&r=json';
    var result;

    request(requestUrl, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            // parse the json result
            result = JSON.parse(body);

            var currentMovie = [];

            for (var i in result) {
                currentMovie[i] = result[i];
            }

            res.render('movie', {items: currentMovie, movie: movieData});
        } else {
            console.log(error, response.statusCode, body);
        }
    });
}

module.exports = router;
