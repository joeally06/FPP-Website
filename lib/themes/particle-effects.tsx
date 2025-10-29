'use client';

import React, { useEffect, useRef } from 'react';

interface ParticleEffectsProps {
  type: 'snowfall' | 'leaves' | 'hearts' | 'fireworks' | 'fog' | 'sparkles' | 'bats' | 'stars' | 'cherry-blossoms' | 'balloons' | 'wind-swirls' | 'ghosts' | 'spider-webs' | 'lightning' | 'candy-canes' | 'ornaments' | 'reindeer' | 'none';
}

export default function ParticleEffects({ type }: ParticleEffectsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (type === 'none') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const particles: Particle[] = [];
    let animationFrameId: number;

    class Particle {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
      angle: number;
      angleSpeed: number;

      constructor() {
        this.x = Math.random() * canvas!.width;
        
        // Bats and reindeer should start distributed across the entire screen
        if (type === 'bats' || type === 'reindeer') {
          this.y = Math.random() * canvas!.height; // Spread across entire screen
        } else if (type === 'ghosts') {
          this.y = canvas!.height + Math.random() * 100; // Start below screen, float up
        } else {
          this.y = Math.random() * canvas!.height - canvas!.height;
        }
        
        // Adjust particle properties based on type
        if (type === 'snowfall') {
          this.size = Math.random() * 4 + 2;
          this.speedY = Math.random() * 2 + 1;
          this.speedX = Math.random() * 0.5 - 0.25;
          this.opacity = Math.random() * 0.6 + 0.4;
        } else if (type === 'fog') {
          this.size = Math.random() * 50 + 40;
          this.speedY = Math.random() * 0.5 + 0.2;
          this.speedX = Math.random() * 1 - 0.5;
          this.opacity = Math.random() * 0.3 + 0.2;
        } else if (type === 'fireworks') {
          this.size = Math.random() * 3 + 1;
          this.speedY = Math.random() * 3 + 2;
          this.speedX = Math.random() * 2 - 1;
          this.opacity = Math.random() * 0.8 + 0.2;
        } else if (type === 'bats') {
          this.size = Math.random() * 25 + 20;
          this.speedY = Math.random() * 1 - 0.5;
          this.speedX = Math.random() * 3 + 1.5;
          this.opacity = Math.random() * 0.5 + 0.5;
        } else if (type === 'ghosts') {
          this.size = Math.random() * 30 + 25;
          this.speedY = -(Math.random() * 0.6 + 0.3); // Float upward
          this.speedX = Math.random() * 0.6 - 0.3; // Gentle drift
          this.opacity = Math.random() * 0.3 + 0.2; // Translucent
        } else if (type === 'spider-webs') {
          // Webs stay in corners
          this.x = Math.random() < 0.5 ? Math.random() * 200 : canvas!.width - Math.random() * 200;
          this.y = Math.random() * 200;
          this.size = Math.random() * 80 + 60;
          this.speedY = 0;
          this.speedX = 0;
          this.opacity = Math.random() * 0.3 + 0.2;
        } else if (type === 'lightning') {
          // Lightning not particle-based, handled differently
          this.size = 0;
          this.speedY = 0;
          this.speedX = 0;
          this.opacity = 0;
        } else if (type === 'candy-canes') {
          this.size = Math.random() * 20 + 15;
          this.speedY = Math.random() * 1.5 + 0.8;
          this.speedX = Math.random() * 0.4 - 0.2;
          this.opacity = Math.random() * 0.4 + 0.5;
        } else if (type === 'ornaments') {
          this.size = Math.random() * 18 + 12;
          this.speedY = Math.random() * 2 + 1;
          this.speedX = Math.random() * 0.6 - 0.3;
          this.opacity = Math.random() * 0.5 + 0.4;
        } else if (type === 'reindeer') {
          this.y = Math.random() * (canvas!.height * 0.3); // Top third of screen
          this.size = Math.random() * 40 + 30;
          this.speedY = Math.random() * 0.3 - 0.15;
          this.speedX = Math.random() * 2.5 + 2; // Fast horizontal
          this.opacity = Math.random() * 0.4 + 0.4;
        } else if (type === 'stars') {
          this.x = Math.random() * canvas!.width;
          this.y = Math.random() * canvas!.height;
          this.size = Math.random() * 3 + 1;
          this.speedY = 0;
          this.speedX = 0;
          this.opacity = Math.random() * 0.5 + 0.3;
        } else if (type === 'cherry-blossoms') {
          this.size = Math.random() * 6 + 3;
          this.speedY = Math.random() * 1 + 0.3;
          this.speedX = Math.random() * 0.8 - 0.4;
          this.opacity = Math.random() * 0.6 + 0.3;
        } else if (type === 'balloons') {
          this.y = canvas!.height + Math.random() * 100;
          this.size = Math.random() * 20 + 15;
          this.speedY = -(Math.random() * 0.8 + 0.4);
          this.speedX = Math.random() * 0.4 - 0.2;
          this.opacity = Math.random() * 0.4 + 0.5;
        } else if (type === 'wind-swirls') {
          this.size = Math.random() * 6 + 3;
          this.speedY = Math.random() * 1.5 + 0.5;
          this.speedX = Math.random() * 1 - 0.5;
          this.opacity = Math.random() * 0.6 + 0.3;
        } else {
          this.size = Math.random() * 3 + 2;
          this.speedY = Math.random() * 1 + 0.5;
          this.speedX = Math.random() * 0.5 - 0.25;
          this.opacity = Math.random() * 0.5 + 0.3;
        }
        
        this.angle = Math.random() * Math.PI * 2;
        this.angleSpeed = type === 'wind-swirls' || type === 'candy-canes' ? Math.random() * 0.05 - 0.025 : Math.random() * 0.02 - 0.01;
      }

      update() {
        // Stars twinkle but don't move
        if (type === 'stars') {
          this.opacity = 0.3 + Math.abs(Math.sin(Date.now() * 0.001 + this.x)) * 0.5;
          return;
        }

        // Spider webs stay stationary
        if (type === 'spider-webs') {
          // Gentle pulsing effect
          this.opacity = 0.2 + Math.abs(Math.sin(Date.now() * 0.0005 + this.x)) * 0.2;
          return;
        }

        // Wind swirls move in circular patterns
        if (type === 'wind-swirls') {
          const radius = 30;
          const centerX = this.x + Math.cos(this.angle) * radius;
          const centerY = this.y + Math.sin(this.angle) * radius;
          this.x = centerX;
          this.y += this.speedY;
        } else {
          this.y += this.speedY;
          this.x += this.speedX;
        }
        
        this.angle += this.angleSpeed;

        // Reset particle when it goes off screen
        if (type === 'balloons' || type === 'ghosts') {
          // Balloons and ghosts rise and reset at top
          if (this.y < -50) {
            this.y = canvas!.height + 10;
            this.x = Math.random() * canvas!.width;
          }
        } else {
          // Most particles fall and reset at bottom
          if (this.y > canvas!.height) {
            this.y = -10;
            this.x = Math.random() * canvas!.width;
          }
        }
        
        if (this.x > canvas!.width || this.x < 0) {
          this.x = Math.random() * canvas!.width;
        }
      }

      draw() {
        if (!ctx) return;

        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        switch (type) {
          case 'snowfall':
            // Draw snowflake with glow
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();
            // Reset shadow
            ctx.shadowBlur = 0;
            break;

          case 'leaves':
            // Draw leaf
            ctx.fillStyle = `hsl(${Math.random() * 60 + 15}, 70%, 50%)`;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.size, this.size * 1.5, 0, 0, Math.PI * 2);
            ctx.fill();
            break;

          case 'hearts':
            // Draw heart
            ctx.fillStyle = '#ff69b4';
            ctx.beginPath();
            ctx.moveTo(0, this.size / 4);
            ctx.bezierCurveTo(-this.size / 2, -this.size / 4, -this.size, this.size / 4, 0, this.size);
            ctx.bezierCurveTo(this.size, this.size / 4, this.size / 2, -this.size / 4, 0, this.size / 4);
            ctx.fill();
            break;

          case 'fog':
            // Draw fog particle with large, visible orange/purple effect
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
            gradient.addColorStop(0, 'rgba(255, 140, 60, 0.5)');
            gradient.addColorStop(0.4, 'rgba(200, 100, 220, 0.3)');
            gradient.addColorStop(1, 'rgba(150, 80, 200, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();
            break;

          case 'sparkles':
            // Draw sparkle
            ctx.fillStyle = `hsl(${Math.random() * 60 + 200}, 100%, 70%)`;
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
              const angle = (Math.PI / 2) * i;
              const x = Math.cos(angle) * this.size;
              const y = Math.sin(angle) * this.size;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            break;

          case 'fireworks':
            // Draw firework particle
            ctx.fillStyle = `hsl(${Math.random() * 360}, 100%, 60%)`;
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();
            // Add trail
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-this.speedX * 5, -this.speedY * 5);
            ctx.stroke();
            break;

          case 'bats':
            // Draw bat silhouette with rigid, angular wings like classic bat shape
            ctx.fillStyle = '#000000'; // Pure black
            ctx.strokeStyle = '#ff6600'; // Orange glow for Halloween
            ctx.lineWidth = 2;
            
            // Add orange glow effect
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#ff6600';
            
            // Wing flapping effect - more dramatic
            const wingFlap = Math.sin(Date.now() * 0.008 + this.x) * 0.4;
            
            // Bat body (elongated)
            ctx.beginPath();
            ctx.ellipse(0, 0, this.size * 0.15, this.size * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Bat head (circular)
            ctx.beginPath();
            ctx.arc(0, -this.size * 0.3, this.size * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Pointy ears
            ctx.beginPath();
            ctx.moveTo(-this.size * 0.15, -this.size * 0.4);
            ctx.lineTo(-this.size * 0.1, -this.size * 0.6);
            ctx.lineTo(-this.size * 0.05, -this.size * 0.4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(this.size * 0.15, -this.size * 0.4);
            ctx.lineTo(this.size * 0.1, -this.size * 0.6);
            ctx.lineTo(this.size * 0.05, -this.size * 0.4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // LEFT WING - Angular, pointed design
            ctx.beginPath();
            ctx.moveTo(-this.size * 0.15, 0); // Wing attachment point
            
            // First finger
            ctx.lineTo(-this.size * 0.5, -this.size * 0.3 + wingFlap);
            ctx.lineTo(-this.size * 0.6, -this.size * 0.4 + wingFlap);
            
            // Second finger (middle, longest)
            ctx.lineTo(-this.size * 0.8, -this.size * 0.5 + wingFlap);
            ctx.lineTo(-this.size * 0.95, -this.size * 0.6 + wingFlap);
            
            // Third finger
            ctx.lineTo(-this.size * 1.0, -this.size * 0.4 + wingFlap);
            ctx.lineTo(-this.size * 0.95, -this.size * 0.2 + wingFlap);
            
            // Wing membrane bottom edge
            ctx.lineTo(-this.size * 0.7, this.size * 0.1 + wingFlap * 0.5);
            ctx.lineTo(-this.size * 0.4, this.size * 0.15 + wingFlap * 0.3);
            ctx.lineTo(-this.size * 0.15, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // RIGHT WING - Angular, pointed design (mirror)
            ctx.beginPath();
            ctx.moveTo(this.size * 0.15, 0); // Wing attachment point
            
            // First finger
            ctx.lineTo(this.size * 0.5, -this.size * 0.3 + wingFlap);
            ctx.lineTo(this.size * 0.6, -this.size * 0.4 + wingFlap);
            
            // Second finger (middle, longest)
            ctx.lineTo(this.size * 0.8, -this.size * 0.5 + wingFlap);
            ctx.lineTo(this.size * 0.95, -this.size * 0.6 + wingFlap);
            
            // Third finger
            ctx.lineTo(this.size * 1.0, -this.size * 0.4 + wingFlap);
            ctx.lineTo(this.size * 0.95, -this.size * 0.2 + wingFlap);
            
            // Wing membrane bottom edge
            ctx.lineTo(this.size * 0.7, this.size * 0.1 + wingFlap * 0.5);
            ctx.lineTo(this.size * 0.4, this.size * 0.15 + wingFlap * 0.3);
            ctx.lineTo(this.size * 0.15, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Add red glowing eyes
            ctx.fillStyle = '#ff0000';
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#ff0000';
            ctx.beginPath();
            ctx.arc(-this.size * 0.08, -this.size * 0.3, this.size * 0.06, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(this.size * 0.08, -this.size * 0.3, this.size * 0.06, 0, Math.PI * 2);
            ctx.fill();
            
            // Reset shadow
            ctx.shadowBlur = 0;
            break;

          case 'stars':
            // Draw twinkling star
            ctx.fillStyle = '#ffffcc';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ffffff';
            
            // Draw star with 5 points
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
              const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
              const x = Math.cos(angle) * this.size;
              const y = Math.sin(angle) * this.size;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
              
              // Inner point
              const innerAngle = angle + Math.PI / 5;
              const innerX = Math.cos(innerAngle) * (this.size * 0.4);
              const innerY = Math.sin(innerAngle) * (this.size * 0.4);
              ctx.lineTo(innerX, innerY);
            }
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            break;

          case 'cherry-blossoms':
            // Draw pink cherry blossom petal
            ctx.fillStyle = '#ffb7d5';
            ctx.strokeStyle = '#ff69b4';
            ctx.lineWidth = 0.5;
            
            // Draw 5 petals
            for (let i = 0; i < 5; i++) {
              const petalAngle = (Math.PI * 2 * i) / 5;
              ctx.save();
              ctx.rotate(petalAngle);
              ctx.beginPath();
              ctx.ellipse(this.size * 0.5, 0, this.size * 0.4, this.size * 0.6, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
              ctx.restore();
            }
            
            // Center
            ctx.fillStyle = '#fff59d';
            ctx.beginPath();
            ctx.arc(0, 0, this.size * 0.2, 0, Math.PI * 2);
            ctx.fill();
            break;

          case 'balloons':
            // Draw colorful balloon
            const balloonColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#fd79a8'];
            const balloonColor = balloonColors[Math.floor(this.x / 100) % balloonColors.length];
            
            // Balloon
            ctx.fillStyle = balloonColor;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.size * 0.6, this.size * 0.8, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Shine/highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.ellipse(-this.size * 0.2, -this.size * 0.3, this.size * 0.2, this.size * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // String
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, this.size * 0.8);
            ctx.quadraticCurveTo(this.size * 0.2, this.size * 1.5, 0, this.size * 2);
            ctx.stroke();
            break;

          case 'wind-swirls':
            // Draw autumn leaf in wind swirl
            const leafColors = ['#d35400', '#e67e22', '#f39c12', '#8b4513', '#c0392b'];
            const leafColor = leafColors[Math.floor(this.x / 100) % leafColors.length];
            
            ctx.fillStyle = leafColor;
            ctx.strokeStyle = '#8b4513';
            ctx.lineWidth = 0.5;
            
            // Leaf shape
            ctx.beginPath();
            ctx.moveTo(0, -this.size);
            ctx.quadraticCurveTo(this.size * 0.5, -this.size * 0.5, this.size * 0.7, 0);
            ctx.quadraticCurveTo(this.size * 0.5, this.size * 0.3, 0, this.size);
            ctx.quadraticCurveTo(-this.size * 0.5, this.size * 0.3, -this.size * 0.7, 0);
            ctx.quadraticCurveTo(-this.size * 0.5, -this.size * 0.5, 0, -this.size);
            ctx.fill();
            ctx.stroke();
            
            // Leaf vein
            ctx.strokeStyle = '#8b4513';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, -this.size);
            ctx.lineTo(0, this.size);
            ctx.stroke();
            break;

          case 'ghosts':
            // Draw translucent ghost floating upward
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 2;
            
            // Ghost body (rounded top, wavy bottom)
            ctx.beginPath();
            ctx.arc(0, -this.size * 0.3, this.size * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Ghost sheet
            ctx.beginPath();
            ctx.moveTo(-this.size * 0.4, -this.size * 0.3);
            ctx.lineTo(-this.size * 0.4, this.size * 0.3);
            // Wavy bottom
            ctx.quadraticCurveTo(-this.size * 0.3, this.size * 0.5, -this.size * 0.2, this.size * 0.3);
            ctx.quadraticCurveTo(-this.size * 0.1, this.size * 0.1, 0, this.size * 0.3);
            ctx.quadraticCurveTo(this.size * 0.1, this.size * 0.5, this.size * 0.2, this.size * 0.3);
            ctx.quadraticCurveTo(this.size * 0.3, this.size * 0.1, this.size * 0.4, this.size * 0.3);
            ctx.lineTo(this.size * 0.4, -this.size * 0.3);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Eyes (spooky!)
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(-this.size * 0.15, -this.size * 0.3, this.size * 0.08, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(this.size * 0.15, -this.size * 0.3, this.size * 0.08, 0, Math.PI * 2);
            ctx.fill();
            
            // Mouth (O shape)
            ctx.beginPath();
            ctx.arc(0, -this.size * 0.1, this.size * 0.1, 0, Math.PI * 2);
            ctx.fill();
            break;

          case 'spider-webs':
            // Draw spider web in corner
            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 1;
            ctx.shadowBlur = 3;
            ctx.shadowColor = '#ffffff';
            
            const webLines = 6;
            const webRings = 4;
            
            // Radial lines
            for (let i = 0; i < webLines; i++) {
              const angle = (Math.PI * 2 * i) / webLines;
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(Math.cos(angle) * this.size, Math.sin(angle) * this.size);
              ctx.stroke();
            }
            
            // Concentric rings
            for (let ring = 1; ring <= webRings; ring++) {
              const radius = (this.size * ring) / webRings;
              ctx.beginPath();
              for (let i = 0; i <= webLines; i++) {
                const angle = (Math.PI * 2 * i) / webLines;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
              ctx.stroke();
            }
            
            // Spider in center
            ctx.fillStyle = '#000000';
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(0, 0, this.size * 0.08, 0, Math.PI * 2);
            ctx.fill();
            break;

          case 'candy-canes':
            // Draw rotating candy cane
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = this.size * 0.2;
            ctx.lineCap = 'round';
            
            // Cane hook
            ctx.beginPath();
            ctx.arc(0, -this.size * 0.4, this.size * 0.2, Math.PI, Math.PI * 2);
            ctx.stroke();
            
            // Cane stick
            ctx.beginPath();
            ctx.moveTo(this.size * 0.2, -this.size * 0.4);
            ctx.lineTo(this.size * 0.2, this.size * 0.6);
            ctx.stroke();
            
            // White stripes
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = this.size * 0.1;
            for (let i = 0; i < 5; i++) {
              ctx.beginPath();
              ctx.moveTo(this.size * 0.2, -this.size * 0.3 + i * this.size * 0.2);
              ctx.lineTo(this.size * 0.2, -this.size * 0.2 + i * this.size * 0.2);
              ctx.stroke();
            }
            break;

          case 'ornaments':
            // Draw Christmas ornament
            const ornamentColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
            const ornamentColor = ornamentColors[Math.floor(this.x / 100) % ornamentColors.length];
            
            ctx.fillStyle = ornamentColor;
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            
            // Ornament ball
            ctx.beginPath();
            ctx.arc(0, 0, this.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Shine
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(-this.size * 0.2, -this.size * 0.2, this.size * 0.15, 0, Math.PI * 2);
            ctx.fill();
            
            // Cap/hanger
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(-this.size * 0.15, -this.size * 0.6, this.size * 0.3, this.size * 0.15);
            
            // Hook
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = this.size * 0.1;
            ctx.beginPath();
            ctx.arc(0, -this.size * 0.7, this.size * 0.1, 0, Math.PI);
            ctx.stroke();
            break;

          case 'reindeer':
            // Draw reindeer silhouette flying
            ctx.fillStyle = '#8b4513';
            ctx.strokeStyle = '#654321';
            ctx.lineWidth = 2;
            
            // Body
            ctx.beginPath();
            ctx.ellipse(0, 0, this.size * 0.4, this.size * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Head
            ctx.beginPath();
            ctx.ellipse(-this.size * 0.5, -this.size * 0.1, this.size * 0.2, this.size * 0.2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Antlers
            ctx.strokeStyle = '#654321';
            ctx.lineWidth = this.size * 0.05;
            // Left antler
            ctx.beginPath();
            ctx.moveTo(-this.size * 0.55, -this.size * 0.3);
            ctx.lineTo(-this.size * 0.65, -this.size * 0.5);
            ctx.moveTo(-this.size * 0.6, -this.size * 0.4);
            ctx.lineTo(-this.size * 0.7, -this.size * 0.45);
            ctx.stroke();
            // Right antler
            ctx.beginPath();
            ctx.moveTo(-this.size * 0.45, -this.size * 0.3);
            ctx.lineTo(-this.size * 0.35, -this.size * 0.5);
            ctx.moveTo(-this.size * 0.4, -this.size * 0.4);
            ctx.lineTo(-this.size * 0.3, -this.size * 0.45);
            ctx.stroke();
            
            // Legs (running position)
            ctx.lineWidth = this.size * 0.08;
            const legOffset = Math.sin(Date.now() * 0.01 + this.x) * 0.2;
            ctx.beginPath();
            ctx.moveTo(-this.size * 0.2, this.size * 0.2);
            ctx.lineTo(-this.size * 0.2, this.size * 0.5 + legOffset);
            ctx.moveTo(this.size * 0.2, this.size * 0.2);
            ctx.lineTo(this.size * 0.2, this.size * 0.5 - legOffset);
            ctx.stroke();
            
            // Red nose (Rudolph!)
            ctx.fillStyle = '#ff0000';
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#ff0000';
            ctx.beginPath();
            ctx.arc(-this.size * 0.65, -this.size * 0.05, this.size * 0.08, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            break;
        }

        ctx.restore();
      }
    }

    // Create particles
    const particleCount = type === 'fog' ? 20 
      : type === 'fireworks' ? 60 
      : type === 'snowfall' ? 100 
      : type === 'bats' ? 12
      : type === 'ghosts' ? 8
      : type === 'spider-webs' ? 6
      : type === 'lightning' ? 0 // Lightning uses different mechanism
      : type === 'candy-canes' ? 25
      : type === 'ornaments' ? 30
      : type === 'reindeer' ? 5
      : type === 'stars' ? 50
      : type === 'cherry-blossoms' ? 40
      : type === 'balloons' ? 20
      : type === 'wind-swirls' ? 60
      : 80;
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    // Lightning flash effect (separate from particles)
    let lastLightningTime = Date.now();
    const drawLightning = () => {
      const now = Date.now();
      const timeSinceLastFlash = now - lastLightningTime;
      
      // Random lightning every 3-8 seconds
      if (timeSinceLastFlash > Math.random() * 5000 + 3000) {
        lastLightningTime = now;
        
        // Flash the screen
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw lightning bolts
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffff00';
        
        const startX = Math.random() * canvas.width;
        const segments = 8 + Math.floor(Math.random() * 5);
        
        ctx.beginPath();
        ctx.moveTo(startX, 0);
        
        let currentX = startX;
        let currentY = 0;
        
        for (let i = 0; i < segments; i++) {
          currentY += canvas.height / segments;
          currentX += (Math.random() - 0.5) * 100;
          ctx.lineTo(currentX, currentY);
          
          // Branch off occasionally
          if (Math.random() > 0.7) {
            const branchX = currentX + (Math.random() - 0.5) * 80;
            const branchY = currentY + 50;
            ctx.moveTo(currentX, currentY);
            ctx.lineTo(branchX, branchY);
            ctx.moveTo(currentX, currentY);
          }
        }
        
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    };

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw lightning effect if type is lightning
      if (type === 'lightning') {
        drawLightning();
      }

      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [type]);

  if (type === 'none') return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: type === 'fog' ? 0.8 : 0.7 }}
    />
  );
}
