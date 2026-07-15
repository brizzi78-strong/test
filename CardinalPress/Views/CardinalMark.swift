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

            let red = tint ?? Theme.cardinal
            let darkRed = tint ?? Theme.cardinalDark
            let black = tint ?? Color(red: 0.2, green: 0.12, blue: 0.13)
            let beak = tint ?? Color(red: 0.94, green: 0.55, blue: 0.18)

            context.translateBy(x: 0, y: pose.bob * s)

            // Tail — long, elegant feathers swept back
            var tailPath = bezierPath([(56, 70), (92, 65), (88, 80), (52, 82)])
            if pose.tailLift != 0 {
                tailPath = tailPath.applying(rotation(about: 54, 75, degrees: -pose.tailLift * 0.6))
            }
            context.fill(tailPath, with: .color(darkRed))

            // Body — smooth, rounded, full-bodied
            context.fill(ellipse(50, 68, 30, 28), with: .color(red))

            // Wing — darker overlay, smooth curve
            if tint == nil {
                context.fill(ellipse(60, 66, 22, 13).applying(rotation(about: 60, 66, degrees: 22)),
                             with: .color(darkRed.opacity(0.8)))
            }

            // Head — round, natural proportions
            context.fill(ellipse(40, 42, 18, 18), with: .color(red))

            // Crest — two smooth pointed feathers, iconic cardinal silhouette
            let crestLift: CGFloat = pose.tailLift > 0 ? pose.tailLift * 0.15 : 0
            context.fill(bezierPath([(32, 32), (35, 4 - crestLift), (40, 28)]),
                         with: .color(red))
            context.fill(bezierPath([(40, 28), (46, 2 - crestLift), (51, 32)]),
                         with: .color(red))

            // Face mask — subtle, natural
            if tint == nil {
                context.fill(bezierPath([(24, 40), (35, 35), (42, 40), (40, 50), (28, 51)]),
                             with: .color(black.opacity(0.65)))
            }

            // Beak — small, pointed, natural angle
            context.fill(bezierPath([(18, 40), (28, 37), (28, 43)]),
                         with: .color(beak))

            // Eye
            if tint == nil {
                context.fill(ellipse(39, 36, 2.6, 2.6), with: .color(black))
                if pose.isBlinking {
                    context.fill(ellipse(39, 36, 2.6, 0.4), with: .color(black.opacity(0.9)))
                } else {
                    context.fill(ellipse(39.8, 35.0, 1.1, 1.1), with: .color(.white.opacity(0.95)))
                }
            } else {
                context.fill(ellipse(39, 36, 2.8, pose.isBlinking ? 0.4 : 2.8), with: .color(red))
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
