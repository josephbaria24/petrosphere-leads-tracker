"use client";

import Spline from "@splinetool/react-spline";

export default function Robot() {
  return (
    <div style={{ width: "100%", height: "400px" }}>
      <Spline scene="/spline/robot.spline" />
    </div>
  );
}