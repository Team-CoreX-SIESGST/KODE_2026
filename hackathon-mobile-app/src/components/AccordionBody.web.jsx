import React from "react";
import { StyleSheet } from "react-native";
import { AnimatePresence, motion } from "framer-motion";

export default function AccordionBody({ open, style, children }) {
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          initial={{ opacity: 0, height: 0, y: -10 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0, y: -10 }}
          transition={{
            duration: 0.34,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{ overflow: "hidden" }}
        >
          <div style={StyleSheet.flatten(style)}>{children}</div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
