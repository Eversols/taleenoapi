const Joi = require('joi');
const chatModel = require('../models/chatModel');

// Joi Validation Schema
const chatSchema = Joi.object({
    sender_id: Joi.number().integer().required(),
    receiver_id: Joi.number().integer().required(),
    booking_id: Joi.number().integer().optional(),
    message: Joi.string().max(500).required(),
});

// Create Chat
exports.createChat = (req, res) => {
    const { error } = chatSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: 'Validation error.', details: error.details });
    }

    const data = req.body;

    chatModel.createChat(data, (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error.', error: err });
        res.status(201).json({ message: 'Chat created successfully!', id: result.insertId });
    });
};

// Get All Chats
exports.getAllChats = (req, res) => {
    chatModel.getAllChats((err, chats) => {
        if (err) return res.status(500).json({ message: 'Database error.', error: err });
        res.status(200).json(chats);
    });
};

// Get Chat by ID
exports.getChatById = (req, res) => {
    const idSchema = Joi.object({ id: Joi.number().integer().required() });
    const { error } = idSchema.validate(req.params);
    if (error) {
        return res.status(400).json({ message: 'Validation error.', details: error.details });
    }

    const { id } = req.params;

    chatModel.getChatById(id, (err, chat) => {
        if (err) return res.status(500).json({ message: 'Database error.', error: err });
        if (!chat) return res.status(404).json({ message: 'Chat not found.' });
        res.status(200).json(chat);
    });
};

// Get Chats Between Two Users
exports.getChatsBetweenUsers = (req, res) => {
    const userSchema = Joi.object({
        sender_id: Joi.number().integer().required(),
        receiver_id: Joi.number().integer().required(),
    });
    const { error } = userSchema.validate(req.query);
    if (error) {
        return res.status(400).json({ message: 'Validation error.', details: error.details });
    }

    const { sender_id, receiver_id } = req.query;

    chatModel.getChatsBetweenUsers(sender_id, receiver_id, (err, chats) => {
        if (err) return res.status(500).json({ message: 'Database error.', error: err });
        res.status(200).json(chats);
    });
};

// Delete Chat
exports.deleteChat = (req, res) => {
    const idSchema = Joi.object({ id: Joi.number().integer().required() });
    const { error } = idSchema.validate(req.params);
    if (error) {
        return res.status(400).json({ message: 'Validation error.', details: error.details });
    }

    const { id } = req.params;

    chatModel.deleteChat(id, (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error.', error: err });
        res.status(200).json({ message: 'Chat deleted successfully!' });
    });
};
