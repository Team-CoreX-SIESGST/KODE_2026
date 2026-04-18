import React from "react";
import { StyleSheet } from "react-native";
import { motion } from "framer-motion";

export default function MotionReveal({
  children,
  delay = 0,
  duration = 0.48,
  offset = 18,
  scaleFrom = 0.985,
  style,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: offset, scale: scaleFrom }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration,
        delay: delay / 1000,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={StyleSheet.flatten(style)}
    >
      {children}
    </motion.div>
  );
}
