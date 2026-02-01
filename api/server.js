const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. CLASS MOBINIME (CORE ENGINE) ---
class Mobinime {
    constructor() {
        this.inst = axios.create({
            baseURL: 'https://air.vunime.my.id/mobinime',
            headers: {
                'accept-encoding': 'gzip',
                'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
                host: 'air.vunime.my.id',
                'user-agent': 'Dart/3.3 (dart:io)',
                'x-api-key': 'ThWmZq4t7w!z%C*F-JaNdRgUkXn2r5u8'
            }
        });
    }
    
    genreList = async function () {
        try {
            const { data } = await this.inst.get('/anime/genre');
            return data;
        } catch (error) { throw new Error(error.message); }
    }
    
    animeList = async function (type, { page = '0', count = '15', genre = '' } = {}) {
        try {
            const types = { series: '1', movie: '3', ova: '2', 'live-action': '4' };
            const activeType = types[type] || '1';
            let gnrId = '';
            if (genre) {
                const genres = await this.genreList();
                const found = genres.find(g => g.title.toLowerCase().replace(/\s+/g, '-') === genre.toLowerCase());
                gnrId = found ? found.id : '';
            }
            const { data } = await this.inst.post('/anime/list', {
                perpage: count.toString(),
                startpage: page.toString(),
                userid: '',
                sort: '',
                genre: gnrId.toString(),
                jenisanime: activeType
            });
            return data;
        } catch (error) { throw new Error(error.message); }
    }
    
    search = async function (query, { page = '0', count = '25' } = {}) {
        try {
            const { data } = await this.inst.post('/anime/search', {
                perpage: count.toString(),
                startpage: page.toString(),
                q: query
            });
            return data;
        } catch (error) { throw new Error(error.message); }
    }
    
    detail = async function (id) {
        try {
            const { data } = await this.inst.post('/anime/detail', { id: id.toString() });
            return data;
        } catch (error) { throw new Error(error.message); }
    }
    
    stream = async function (id, epsid, { quality = 'HD' } = {}) {
        try {
            const { data: srv } = await this.inst.post('/anime/get-server-list', {
                id: epsid.toString(),
                animeId: id.toString(),
                jenisAnime: '1',
                userId: ''
            });
            const { data } = await this.inst.post('/anime/get-url-video', {
                url: srv.serverurl,
                quality: quality,
                position: '0'
            });
            return data.url;
        } catch (error) { throw new Error(error.message); }
    }
}

// --- 2. FUNGSI GEMINI ---
async function gemini({ message, instruction = '', sessionId = null }) {
    try {
        if (!message) throw new Error('Message is required.');
        let resumeArray = null, cookie = null, savedInstruction = instruction;
        if (sessionId) {
            try {
                const sessionData = JSON.parse(Buffer.from(sessionId, 'base64').toString());
                resumeArray = sessionData.resumeArray;
                cookie = sessionData.cookie;
                savedInstruction = instruction || sessionData.instruction || '';
            } catch (e) { console.error('Session Error:', e.message); }
        }
        if (!cookie) {
            const { headers } = await axios.post('https://gemini.google.com/_/BardChatUi/data/batchexecute?rpcids=maGuAc&source-path=%2F&bl=boq_assistant-bard-web-server_20250814.06_p1&f.sid=-7816331052118000090&hl=en-US&_reqid=173780&rt=c', 'f.req=%5B%5B%5B%22maGuAc%22%2C%22%5B0%5D%22%2Cnull%2C%22generic%22%5D%5D%5D&', {
                headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' }
            });
            cookie = headers['set-cookie']?.[0]?.split('; ')[0] || '';
        }
        const requestBody = [[message, 0, null, null, null, null, 0], ["en-US"], resumeArray || ["", "", "", null, null, null, null, null, null, ""], null, null, null, [1], 1, null, null, 1, 0, null, null, null, null, null, [[0]], 1, null, null, null, null, null, ["", "", savedInstruction, null, null, null, null, null, 0, null, 1, null, null, null, []], null, null, 1, null, null, null, null, null, null, null, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], 1, null, null, null, null, [1]];
        const payload = [null, JSON.stringify(requestBody)];
        const { data } = await axios.post('https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate?bl=boq_assistant-bard-web-server_20250729.06_p0&hl=en-US&_reqid=2813378&rt=c', new URLSearchParams({ 'f.req': JSON.stringify(payload) }).toString(), {
            headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8', 'cookie': cookie }
        });
        const match = Array.from(data.matchAll(/^\d+\n(.+?)\n/gm));
        const parse1 = JSON.parse(JSON.parse(match.reverse()[3][1])[0][2]);
        const newSessionId = Buffer.from(JSON.stringify({
            resumeArray: [...parse1[1], parse1[4][0][0]],
            cookie: cookie,
            instruction: savedInstruction
        })).toString('base64');
        return { text: parse1[4][0][1][0].replace(/\*\*(.+?)\*\*/g, '*$1*'), sessionId: newSessionId };
    } catch (error) { throw new Error(error.message); }
}

const m = new Mobinime();

// --- 3. ENDPOINTS (PREFIX /api UNTUK VERCEL) ---
app.get('/api/list', async (req, res) => {
    try {
        const { type, page, count, genre } = req.query;
        const data = await m.animeList(type || 'series', { page: page || '0', count: count || '15', genre: genre || '' });
        res.json({ success: true, result: data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/api/search', async (req, res) => {
    try {
        const data = await m.search(req.query.q, { page: req.query.page || '0' });
        res.json({ success: true, result: data });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/detail', async (req, res) => {
    try {
        const data = await m.detail(req.query.id);
        res.json({ success: true, result: data });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/stream', async (req, res) => {
    try {
        const url = await m.stream(req.query.id, req.query.epsId, { quality: req.query.quality || 'HD' });
        res.json({ success: true, result: url });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/ask', async (req, res) => {
    try {
        const result = await gemini({ message: req.body.message, sessionId: req.body.sessionId });
        res.json({ success: true, result });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// --- 4. EXPORT UNTUK VERCEL ---
module.exports = app;
