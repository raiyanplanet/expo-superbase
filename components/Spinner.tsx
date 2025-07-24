import React, { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

const LoadingSpinner = ({ size = 20, color = "#000000", className = "" }) => {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startSpinning = () => {
      spinValue.setValue(0);
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 800,
        easing: Easing.bezier(0.4, 0.0, 0.6, 1),
        useNativeDriver: true,
      }).start(() => startSpinning());
    };

    startSpinning();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View
      className={`rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        borderWidth: Math.max(2, size / 10),
        borderColor: `${color}20`,
        borderTopColor: color,
        transform: [{ rotate: spin }],
      }}
    />
  );
};

export default LoadingSpinner;
