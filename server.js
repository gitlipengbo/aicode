const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const ZHIPU_API_KEY = '0d89b7f4e0e71da8ad2d5e1b89b93ffd.mAKQt5wfUHEKob68';
const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

// 生成JWT token
function generateToken(apiKey) {
    try {
        const [id, secret] = apiKey.split('.');
        
        const payload = {
            api_key: id,
            exp: Date.now() + 3600 * 1000, // 1小时过期
            timestamp: Date.now()
        };

        const token = jwt.sign(payload, secret, {
            algorithm: 'HS256',
            header: {
                alg: 'HS256',
                sign_type: 'SIGN'
            }
        });

        return token;
    } catch (error) {
        console.error('生成token错误:', error);
        throw new Error('Invalid API key');
    }
}

app.post('/api/chat', async (req, res) => {
    try {
        // 生成token
        const token = generateToken(ZHIPU_API_KEY);

        const response = await fetch(ZHIPU_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream'
            },
            body: JSON.stringify({
                model: "glm-4",
                messages: req.body.messages,
                stream: true
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            return res.status(response.status).json({
                error: `API request failed: ${response.status} ${response.statusText}`,
                details: errorText
            });
        }

        // 设置响应头
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 处理流数据
        response.body.on('data', chunk => {
            res.write(chunk);
        });

        response.body.on('end', () => {
            res.write('data: [DONE]\n\n');
            res.end();
        });

        response.body.on('error', error => {
            console.error('Stream Error:', error);
            if (!res.finished) {
                res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
                res.end();
            }
        });

    } catch (error) {
        console.error('Server Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        }
    }
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
}); 