import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

const zai = await ZAI.create();
const imgBuffer = fs.readFileSync('/home/z/my-project/upload/pasted_image_1775893412647.png');
const base64Img = imgBuffer.toString('base64');

const resp = await zai.chat.completions.createVision({
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'Describe EXACTLY every text, label, value, token, ID, phone number and configuration detail visible in this Meta Developer Console screenshot. I need ALL information shown on screen.' },
      { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Img}` } }
    ]
  }],
  thinking: { type: 'disabled' }
});

console.log(resp.choices[0]?.message?.content);
