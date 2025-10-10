// components/LoadingOverlay.tsx
import React, { useState, useEffect } from 'react';

interface LoadingOverlayProps {
    isVisible: boolean;
    currentStep: string;
    progress: number;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
    isVisible,
    currentStep,
    progress
}) => {
    const [displayText, setDisplayText] = useState('');

    // Typing effect for current step
    useEffect(() => {
        if (!isVisible) return;

        if (isVisible) {
            document.body.style.height = "100vh"
            document.body.style.overflowY = "hidden"
        } else {
            document.body.style.height = "auto"
            document.body.style.overflowY = "auto"
        }

        let currentIndex = 0;
        const text = currentStep;
        setDisplayText('');

        const typingInterval = setInterval(() => {
            if (currentIndex <= text.length) {
                setDisplayText(text.substring(0, currentIndex));
                currentIndex++;
            } else {
                clearInterval(typingInterval);
            }
        }, 50);

        return () => clearInterval(typingInterval);
    }, [isVisible, currentStep]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#01312D]/95 backdrop-blur-sm" style={{ height: "100vh" }} >
            <div className="bg-[#FCFFF7] rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border-2 border-[#BFF102]">
                {/* Logo */}
                <div className="flex justify-center mb-6">
                    <img
                        src="https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Logo-horizontal-color_3x_7f0e1208-fee2-4f72-89c4-68fa5445efdf.png?v=1723661805"
                        alt="ShadeSpace Logo"
                        className="h-16 w-auto"
                    />
                </div>

                {/* Animated Spinner */}
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-[#01312D]/20 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-[#BFF102] rounded-full animate-spin"></div>
                        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-b-[#83CC20] rounded-full animate-spin animation-delay-75"></div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                    <div className="flex justify-between text-sm text-[#01312D] mb-2">
                        <span>Processing your order...</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-[#01312D]/20 rounded-full h-2">
                        <div
                            className="bg-gradient-to-r from-[#BFF102] to-[#83CC20] h-2 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        >&nbsp;</div>
                    </div>
                </div>

                {/* Current Step with Typing Effect */}
                <div className="text-center">
                    <div className="min-h-8">
                        <p className="text-[#01312D] font-medium text-lg">
                            {displayText}
                            <span className="animate-pulse">|</span>
                        </p>
                    </div>
                    <p className="text-[#01312D]/70 text-sm mt-2">
                        Please wait while we prepare your custom shade sail...
                    </p>
                </div>

                {/* Decorative Elements */}
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-[#BFF102] rounded-full animate-ping">&nbsp;</div>
                <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-[#83CC20] rounded-full animate-ping animation-delay-200">&nbsp;</div>
            </div>
        </div>
    );
};