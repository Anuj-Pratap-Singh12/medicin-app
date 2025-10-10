import { motion } from "framer-motion";

const MedicalHeartAnimation = () => (
  <div className="heart-anim-wrap">
    <motion.svg
      width={120}
      height={120}
      viewBox="0 0 120 120"
      fill="none"
      className="heart-svg"
      initial={{ y: 0, scale: 1 }}
      animate={{ y: [0, -18, 0, 14, 0], scale: [1, 1.09, 1] }}
      transition={{
        duration: 3.3,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      style={{ display: "block", margin: "auto" }}
    >
      {/* Heart shape: left dark blue, right light blue */}
      <path
        d="M60 110 Q15 80 25 50 Q35 20 60 35 Q85 20 95 50 Q105 80 60 110 Z"
        fill="#23236D"
      />
      <path
        d="M60 110 Q105 80 95 50 Q85 20 60 35 Q35 20 25 50 Q15 80 60 110 Z"
        fill="#38B6FF"
        opacity="0.9"
      />
      {/* Plus sign in center */}
      <rect x="52" y="57" width="16" height="6" rx="2" fill="#fff"/>
      <rect x="57" y="52" width="6" height="16" rx="2" fill="#fff"/>
    </motion.svg>
  </div>
);

export default MedicalHeartAnimation;