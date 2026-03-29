import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple notification sound endpoint
 * Returns a simple beep sound as MP3
 */
export async function GET(request: NextRequest) {
  try {
    // Create a simple notification sound (base64 encoded MP3)
    // This is a very short, simple beep sound in MP3 format
    const soundBase64 = 
      'SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//NJZAA=' +
      'AAAASUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//MJZAAo' +
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MJZAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
      'AAAAAAAAAAAAAAAA';

    // Create audio using Web Audio API approach - return HTML with embedded audio
    const audioHtml = `
      <html>
        <head>
          <script>
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 1000;
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
          </script>
        </head>
        <body></body>
      </html>
    `;

    // Instead, return a proper response that tells the client to use Web Audio API
    return NextResponse.json({
      message: 'Use Web Audio API for notification sound',
      type: 'audio'
    });
  } catch (error) {
    console.error('Sound generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate sound' },
      { status: 500 }
    );
  }
}
