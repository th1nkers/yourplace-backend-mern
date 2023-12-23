const { validationResult } = require('express-validator');
const fs = require('fs');


const HttpError = require('../models/http-error');
// const getCoordsForAddress = require('../util/location');
const Place = require('../models/place');
const User = require('../models/user');
const { default: mongoose } = require('mongoose');


//------------------------------------------------

const getPlaceById = async (req, res, next) => {
    const placeId = req.params.pid;

    // const place = DUMMY_PLACES.find(p => p.id === placeId)
    let place;
    try {
        place = await Place.findById(placeId);
    } catch (err) {
        const error = new HttpError(
            'Something went wrong, could not find a place.',
            500
        );
        return next(error);
    }

    if (!place) {
        throw new HttpError('Could not find a place for the provided id.', 404);
    }

    res.json({ place: place.toObject({ getters: true }) });
}

//-----------------------------------------------

const getPlaceByUserId = async (req, res, next) => {
    const userId = req.params.uid;
    // const place = DUMMY_PLACES.find(p => p.creator === userId);

    let userWithPlaces;
    try {
        userWithPlaces = await User.findById(userId).populate('places');
    } catch (err) {
        const error = new HttpError(
            'Fetching places failed, please try again later.',
            500
        );
        return next(error);
    }

    if (!userWithPlaces) {
        return next(
            new HttpError('Could not find a place for the provided user id.', 404)
        );
    }

    res.json({ places: userWithPlaces.places.map(place => place.toObject({ getters: true })) });
}

//------------------------------------------------

const createPlace = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(
            new HttpError('Invalid inputs passed, please check your data.', 422)
        );
    }

    const { title, description, address, creator } = req.body;

    // let coordinates;
    // try {
    //     coordinates = await getCoordsForAddress(address);
    // } catch (error) {
    //     return next(error);
    // }
    // DUMMY_PLACES.push(createdPlace);

    const createdPlace = new Place({
        title,
        description,
        address,
        location: {
            lat: 40.7484474,
            lng: -73.9871516
        },
        image: req.file.path,
        creator,
    });

    let user;
    try {
        user = await User.findById(creator);
    } catch (err) {
        console.log(err)
        const error = new HttpError(
            'Creating place failed, please try again.',
            500
        );
        return next(error);
    }

    if (!user) {
        const error = new HttpError('Could not find user for provided id.', 404);
        return next(error);
    }

    console.log(user);

    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await createdPlace.save({ session: sess })
        user.places.push(createdPlace);
        await user.save({ session: sess });
        await sess.commitTransaction();
    } catch (err) {
        const error = new HttpError(
            'Creating place failed, please try again.',
            500
        );
        return next(error);
    }

    res.status(201).json({ place: createdPlace });
}

//------------------------------------------------

const deletePlace = async (req, res, next) => {
    const placeId = req.params.pid;

    let place;
    try {
        place = await Place.findById(placeId).populate('creator');
    } catch (err) {
        console.error(err);
        const error = new HttpError(
            'Something went wrong, could not delete place.',
            500
        );
        return next(error);
    }

    if (!place) {
        const error = new HttpError('Place not found.', 404);
        return next(error);
    }

    const imagePath = place.image;

    try {
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await place.deleteOne({ session: sess });
        
        // Check if place.creator exists before accessing its properties
        if (place.creator) {
            place.creator.places.pull(place);
            await place.creator.save({ session: sess });
        }

        await sess.commitTransaction();
    } catch (err) {
        const error = new HttpError(
            'Something went wrong, could not delete place.',
            500
        );
        return next(error);
    }

    fs.unlink(imagePath, err => {
        if(err) {
            console.error(err);
            return;
        }
        console.log("Image deleted successfully.");
    });

    res.status(200).json({ message: 'Deleted place.' });
};



//-------------------------------------------------

const updatePlace = async (req, res, next) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new HttpError('Invalid inputs passed, please check your data.', 422);
    }

    const { title, description } = req.body;
    const placeId = req.params.pid;

    // const updatedPlace = { ...DUMMY_PLACES.find(p => p.id === placeId) };
    // const placeIndex = DUMMY_PLACES.findIndex(p => p.id === placeId);

    let place;
    try {
        place = await Place.findById(placeId);
    } catch (err) {
        const error = new HttpError(
            'Something went wrong, could not update place.',
            500
        );
        return next(error);
    }


    place.title = title;
    place.description = description;

    // DUMMY_PLACES[placeIndex] = updatedPlace;

    try {
        await place.save();
    } catch (err) {
        const error = new HttpError(
            'Something went wrong, could not update place.',
            500
        );
        return next(error);
    }

    res.status(200).json({ place: place.toObject({ getters: true }) });
}

//------------------------------------------------


exports.getPlaceById = getPlaceById;
exports.getPlaceByUserId = getPlaceByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;