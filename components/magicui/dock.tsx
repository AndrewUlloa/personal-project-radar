"use client";

import { cva, type VariantProps } from "class-variance-authority";
import {
  motion,
  MotionProps,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "motion/react";
import React, { PropsWithChildren, useRef, useState, useEffect } from "react";

import { cn } from "@/lib/utils";

export interface DockProps extends VariantProps<typeof dockVariants> {
  className?: string;
  iconSize?: number;
  iconMagnification?: number;
  iconDistance?: number;
  direction?: "top" | "middle" | "bottom";
  children: React.ReactNode;
}

// New AutoHideDock props
export interface AutoHideDockProps extends DockProps {
  triggerHeight?: number;
  hideDelay?: number;
  showAnimation?: boolean;
  showOnLoad?: boolean;
  initialShowDuration?: number;
}

const DEFAULT_SIZE = 40;
const DEFAULT_MAGNIFICATION = 60;
const DEFAULT_DISTANCE = 140;

const dockVariants = cva(
  "bg-white/30 supports-backdrop-blur:bg-white/10 supports-backdrop-blur:dark:bg-black/10 mx-auto mt-8 flex h-[58px] w-max items-center justify-center gap-2 rounded-2xl border p-2 backdrop-blur-md",
);

const Dock = React.forwardRef<HTMLDivElement, DockProps>(
  (
    {
      className,
      children,
      iconSize = DEFAULT_SIZE,
      iconMagnification = DEFAULT_MAGNIFICATION,
      iconDistance = DEFAULT_DISTANCE,
      direction = "middle",
      ...props
    },
    ref,
  ) => {
    const mouseX = useMotionValue(Infinity);

    const renderChildren = () => {
      return React.Children.map(children, (child) => {
        if (
          React.isValidElement<DockIconProps>(child) &&
          child.type === DockIcon
        ) {
          return React.cloneElement(child, {
            ...child.props,
            mouseX: mouseX,
            size: iconSize,
            magnification: iconMagnification,
            distance: iconDistance,
          });
        }
        return child;
      });
    };

    return (
      <motion.div
        ref={ref}
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        {...props}
        className={cn(dockVariants({ className }), {
          "items-start": direction === "top",
          "items-center": direction === "middle",
          "items-end": direction === "bottom",
        })}
      >
        {renderChildren()}
      </motion.div>
    );
  },
);

Dock.displayName = "Dock";

// Enhanced AutoHideDock component with genie effect
const AutoHideDock = React.forwardRef<HTMLDivElement, AutoHideDockProps>(
  (
    {
      className,
      children,
      iconSize = DEFAULT_SIZE,
      iconMagnification = DEFAULT_MAGNIFICATION,
      iconDistance = DEFAULT_DISTANCE,
      direction = "middle",
      triggerHeight = 20,
      hideDelay = 2000,
      showAnimation = true,
      showOnLoad = false,
      initialShowDuration = 3000,
      ...props
    },
    ref,
  ) => {
    const [isVisible, setIsVisible] = useState(false); // Always start hidden, show via timeout
    const [isHovered, setIsHovered] = useState(false);
    const [hasInitiallyShown, setHasInitiallyShown] = useState(!showOnLoad);
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Handle initial show timeout
    useEffect(() => {
      if (showOnLoad && !hasInitiallyShown) {
        // Delay the initial show to happen after dashboard widgets finish animating
        const showTimeout = setTimeout(() => {
          setIsVisible(true);
        }, 2000); // Show after last widget (1400ms) + animation duration (~600ms)

        const hideTimeout = setTimeout(() => {
          if (!isHovered) {
            setIsVisible(false);
          }
          setHasInitiallyShown(true);
        }, 2000 + initialShowDuration);

        return () => {
          clearTimeout(showTimeout);
          clearTimeout(hideTimeout);
        };
      }
    }, [showOnLoad, hasInitiallyShown, isHovered, initialShowDuration]);

    useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        const windowHeight = window.innerHeight;
        const mouseY = e.clientY;
        const mouseX = e.clientX;
        const windowWidth = window.innerWidth;
        
        // Define trigger area: bottom center portion of screen
        const triggerZone = {
          bottom: windowHeight - triggerHeight,
          left: windowWidth * 0.25, // 25% from left
          right: windowWidth * 0.75, // 75% from left (center 50%)
        };

        const isInTriggerZone = 
          mouseY >= triggerZone.bottom &&
          mouseX >= triggerZone.left &&
          mouseX <= triggerZone.right;

        if (isInTriggerZone && !isVisible) {
          setIsVisible(true);
          setHasInitiallyShown(true); // Mark as having been shown through interaction
          if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
          }
        }
      };

      const scheduleHide = () => {
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
        hideTimeoutRef.current = setTimeout(() => {
          if (!isHovered) {
            setIsVisible(false);
          }
        }, hideDelay);
      };

      document.addEventListener('mousemove', handleMouseMove);
      
      // Schedule hide when mouse stops moving
      let mouseMoveTimeout: NodeJS.Timeout;
      const debouncedScheduleHide = () => {
        clearTimeout(mouseMoveTimeout);
        mouseMoveTimeout = setTimeout(scheduleHide, 100);
      };

      document.addEventListener('mousemove', debouncedScheduleHide);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mousemove', debouncedScheduleHide);
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
        clearTimeout(mouseMoveTimeout);
      };
    }, [isVisible, isHovered, triggerHeight, hideDelay]);

    const handleMouseEnter = () => {
      setIsHovered(true);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
      // Schedule hide after delay
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, hideDelay);
    };

    return (
      <>
        {/* Invisible trigger area - larger safe zone */}
        <div
          className="fixed bottom-0 left-1/6 w-2/3 dock-trigger-area"
          style={{ height: triggerHeight }}
        />
        
        {/* Dock container */}
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 dock-container">
          <AnimatePresence>
            {isVisible && (
              <motion.div
                initial={showAnimation ? { 
                  scale: 0.3, 
                  y: 20, 
                  opacity: 0 
                } : false}
                animate={{ 
                  scale: 1, 
                  y: 0, 
                  opacity: 1 
                }}
                exit={{ 
                  scale: 0.3, 
                  y: 20, 
                  opacity: 0 
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                  mass: 0.5,
                }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <Dock
                  ref={ref}
                  className={className}
                  iconSize={iconSize}
                  iconMagnification={iconMagnification}
                  iconDistance={iconDistance}
                  direction={direction}
                  {...props}
                >
                  {children}
                </Dock>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </>
    );
  },
);

AutoHideDock.displayName = "AutoHideDock";

export interface DockIconProps
  extends Omit<MotionProps & React.HTMLAttributes<HTMLDivElement>, "children"> {
  size?: number;
  magnification?: number;
  distance?: number;
  mouseX?: MotionValue<number>;
  className?: string;
  children?: React.ReactNode;
  props?: PropsWithChildren;
}

const DockIcon = ({
  size = DEFAULT_SIZE,
  magnification = DEFAULT_MAGNIFICATION,
  distance = DEFAULT_DISTANCE,
  mouseX,
  className,
  children,
  ...props
}: DockIconProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const padding = Math.max(6, size * 0.2);
  const defaultMouseX = useMotionValue(Infinity);

  const distanceCalc = useTransform(mouseX ?? defaultMouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const sizeTransform = useTransform(
    distanceCalc,
    [-distance, 0, distance],
    [size, magnification, size],
  );

  const scaleSize = useSpring(sizeTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  return (
    <motion.div
      ref={ref}
      style={{ width: scaleSize, height: scaleSize, padding }}
      className={cn(
        "flex aspect-square cursor-pointer items-center justify-center rounded-full",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};

DockIcon.displayName = "DockIcon";

export { Dock, AutoHideDock, DockIcon, dockVariants };
