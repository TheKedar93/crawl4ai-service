document.addEventListener('DOMContentLoaded', () => {
    // Add random web strings (additional strands)
    const web = document.querySelector('.web');
    const container = document.querySelector('.logo-container');
    const containerRect = container.getBoundingClientRect();
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;
    
    // Create additional web strands
    for (let i = 0; i < 8; i++) {
        const strand = document.createElement('div');
        strand.classList.add('strand');
        const angle = (i * 45) * Math.PI / 180;
        strand.style.width = `${containerRect.width / 2}px`;
        strand.style.height = '1px';
        strand.style.background = 'rgba(0, 0, 0, 0.1)';
        strand.style.position = 'absolute';
        strand.style.top = `${centerY}px`;
        strand.style.left = `${centerX}px`;
        strand.style.transformOrigin = '0 0';
        strand.style.transform = `rotate(${angle}rad)`;
        web.appendChild(strand);
    }
    
    // Track spider for interactive effects
    const spider = document.querySelector('.spider');
    
    // Add endpoint hover effects
    const endpoints = document.querySelectorAll('.endpoint');
    endpoints.forEach(endpoint => {
        endpoint.addEventListener('mouseenter', () => {
            spider.style.animationPlayState = 'paused';
            
            // Move the spider toward the hovered endpoint
            const spiderRect = spider.getBoundingClientRect();
            const spiderX = spiderRect.left + spiderRect.width / 2;
            const spiderY = spiderRect.top + spiderRect.height / 2;
            
            const endpointRect = endpoint.getBoundingClientRect();
            const endpointX = endpointRect.left + endpointRect.width / 2;
            const endpointY = endpointRect.top + endpointRect.height / 2;
            
            // Calculate the angle
            const angle = Math.atan2(endpointY - spiderY, endpointX - spiderX);
            
            // Set the rotation
            spider.style.transform = `rotate(${angle}rad)`;
        });
        
        endpoint.addEventListener('mouseleave', () => {
            // Resume the animation
            spider.style.animationPlayState = 'running';
            spider.style.transform = '';
        });
    });
    
    // Create data dots that move along the web periodically
    setInterval(() => {
        const dataDot = document.createElement('div');
        dataDot.classList.add('data-dot');
        dataDot.style.width = '4px';
        dataDot.style.height = '4px';
        dataDot.style.backgroundColor = getRandomColor(0.7);
        dataDot.style.borderRadius = '50%';
        dataDot.style.position = 'absolute';
        
        // Random starting position on the web
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * (containerRect.width / 2 - 20);
        dataDot.style.top = `${centerY + Math.sin(angle) * distance}px`;
        dataDot.style.left = `${centerX + Math.cos(angle) * distance}px`;
        
        // Add to web
        web.appendChild(dataDot);
        
        // Animate movement
        const duration = 1000 + Math.random() * 2000;
        const targetAngle = angle + (Math.random() * 0.5 - 0.25);
        const targetDistance = distance + (Math.random() * 30 - 15);
        
        dataDot.animate([
            { 
                top: `${centerY + Math.sin(angle) * distance}px`,
                left: `${centerX + Math.cos(angle) * distance}px`,
                opacity: 1
            },
            { 
                top: `${centerY + Math.sin(targetAngle) * targetDistance}px`,
                left: `${centerX + Math.cos(targetAngle) * targetDistance}px`,
                opacity: 0
            }
        ], {
            duration: duration,
            easing: 'ease-out'
        });
        
        // Remove dot after animation
        setTimeout(() => {
            dataDot.remove();
        }, duration);
    }, 300);
    
    // Helper function to get random color
    function getRandomColor(alpha = 1) {
        const colors = [
            `rgba(98, 0, 234, ${alpha})`,  // purple
            `rgba(3, 169, 244, ${alpha})`, // blue
            `rgba(0, 200, 83, ${alpha})`,  // green
            `rgba(255, 87, 34, ${alpha})`, // orange
            `rgba(233, 30, 99, ${alpha})`  // pink
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
});