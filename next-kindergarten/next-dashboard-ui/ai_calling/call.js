require("dotenv").config();
const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_TOKEN
);

client.calls
  .create({
    twiml: `
      <Response>
        <Say voice="alice">
          Hello. This is a demo call from the kindergarten AI agent.
          Your child has been absent for two days.
          Please contact the school. Thank you.
        </Say>
      </Response>
    `,
    from: process.env.TWILIO_PHONE,
    to: "+8801407878016"
  })
  .then(call => console.log("Call placed! Call SID:", call.sid))
  .catch(err => console.error(err));