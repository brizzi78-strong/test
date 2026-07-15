import SwiftUI

/// A moment in the cardinal's idle life: a gentle breathing bob, a blink
/// every few seconds, and an occasional tail flick. Derived purely from
/// the clock so the bird animates without any stored state.
struct CardinalPose {
    var bob: CGFloat = 0          // vertical offset in design units
    var isBlinking = false
    var tailLift: CGFloat = 0     // degrees; positive lifts the tail tip

    init() {}

    init(time t: TimeInterval) {
        bob = sin(t * 1.7) * 0.9
        let blinkCycle = t.truncatingRemainder(dividingBy: 4.3)
        isBlinking = blinkCycle < 0.13
        let flickCycle = t.truncatingRemainder(dividingBy: 7.1)
        if flickCycle < 0.6 {
            tailLift = sin(flickCycle / 0.6 * .pi) * 9
        }
    }
}

/// The app's cardinal emblem, drawn in code so it scales to any size.
/// Same geometry as the app icon. Pass `tint` for a single-color
/// silhouette (e.g. white on the reflection card); nil draws full color.
/// Pass a `pose` to position him mid-blink or mid-tail-flick — see
/// `LivingCardinal` for the animated version.
struct CardinalMark: View {
    var tint: Color? = nil
    var pose = CardinalPose()

    var body: some View {
        Canvas { context, size in
            let s = min(size.width, size.height) / 100

            func point(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
                CGPoint(x: x * s, y: y * s)
            }

            func ellipse(_ cx: CGFloat, _ cy: CGFloat, _ rx: CGFloat, _ ry: CGFloat) -> Path {
                Path(ellipseIn: CGRect(x: (cx - rx) * s, y: (cy - ry) * s, width: rx * 2 * s, height: ry * 2 * s))
            }

            func bezierPath(_ points: [(CGFloat, CGFloat)], closed: Bool = true) -> Path {
                guard points.count >= 2 else { return Path() }
                var path = Path()
                path.move(to: point(points[0].0, points[0].1))
                for i in 1..<points.count {
                    path.addLine(to: point(points[i].0, points[i].1))
                }
                if closed { path.closeSubpath() }
                return path
            }

            func rotation(about cx: CGFloat, _ cy: CGFloat, degrees: CGFloat) -> CGAffineTransform {
                CGAffineTransform(translationX: cx * s, y: cy * s)
                    .rotated(by: degrees * .pi / 180)
                    .translatedBy(x: -cx * s, y: -cy * s)
            }

            let red = tint ?? Color(red: 0.77, green: 0.12, blue: 0.23)
            let darkRed = tint ?? Color(red: 0.63, green: 0.0, blue: 0.0)
            let black = tint ?? Color(red: 0.08, green: 0.08, blue: 0.08)
            let beak = tint ?? Color(red: 1.0, green: 0.80, blue: 0.0)

            context.translateBy(x: 0, y: pose.bob * s)

            // Wing — darker red, layered
            if tint == nil {
                context.fill(bezierPath([(46, 62), (61, 56), (69, 66), (59, 71)]),
                             with: .color(darkRed))
            }

            // Body — full, rounded
            context.fill(ellipse(52, 66, 28, 23), with: .color(red))

            // Head — proportional
            context.fill(ellipse(44, 44, 18, 18), with: .color(red))

            // Crest — pointed upward
            let crestTilt: CGFloat = pose.tailLift > 0 ? pose.tailLift * 0.2 : 0
            context.fill(bezierPath([(40, 34), (44, 10 - crestTilt), (48, 32)]),
                         with: .color(red))

            // Face mask — black patch
            if tint == nil {
                context.fill(bezierPath([(42, 42), (52, 44), (48, 58), (38, 56)]),
                             with: .color(black))
            }

            // Beak — golden
            context.fill(bezierPath([(38, 46), (32, 50), (38, 54)]),
                         with: .color(beak))

            // Eye — with highlight
            if tint == nil {
                context.fill(ellipse(42, 40, 3.2, 3.2), with: .color(.white))
                if pose.isBlinking {
                    context.fill(ellipse(42, 40, 3.2, 0.5), with: .color(black))
                } else {
                    context.fill(ellipse(42, 40, 1.8, 1.8), with: .color(black))
                    context.fill(ellipse(42.5, 39.2, 0.8, 0.8), with: .color(.white.opacity(0.9)))
                }
            } else {
                context.fill(ellipse(42, 40, 3.4, pose.isBlinking ? 0.5 : 3.4), with: .color(red))
            }

            // Tail — long, swept back
            var tail = bezierPath([(60, 66), (78, 70), (75, 84), (62, 78)])
            if pose.tailLift != 0 {
                tail = tail.applying(rotation(about: 64, 75, degrees: -pose.tailLift * 0.4))
            }
            context.fill(tail, with: .color(darkRed))

            // Feet — simple lines
            if tint == nil {
                context.stroke(
                    Path { path in
                        path.move(to: point(48, 85))
                        path.addLine(to: point(44, 100))
                    },
                    with: .color(black),
                    lineWidth: 1.2 * s
                )
                context.stroke(
                    Path { path in
                        path.move(to: point(56, 85))
                        path.addLine(to: point(60, 100))
                    },
                    with: .color(black),
                    lineWidth: 1.2 * s
                )
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .accessibilityHidden(true)
    }
}

/// The cardinal, alive: breathing, blinking, flicking his tail.
/// Falls back to the static mark when Reduce Motion is on.
struct LivingCardinal: View {
    var tint: Color? = nil
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        if reduceMotion {
            CardinalMark(tint: tint)
        } else {
            TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { context in
                CardinalMark(
                    tint: tint,
                    pose: CardinalPose(time: context.date.timeIntervalSinceReferenceDate)
                )
            }
        }
    }
}

#Preview {
    VStack(spacing: 30) {
        LivingCardinal()
            .frame(width: 140)
        CardinalMark(tint: .white)
            .frame(width: 60)
            .padding()
            .background(Theme.reflectionGradient)
    }
    .padding()
}
