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
            func polygon(_ points: [(CGFloat, CGFloat)]) -> Path {
                var path = Path()
                path.move(to: point(points[0].0, points[0].1))
                for p in points.dropFirst() {
                    path.addLine(to: point(p.0, p.1))
                }
                path.closeSubpath()
                return path
            }
            func ellipse(_ cx: CGFloat, _ cy: CGFloat, _ rx: CGFloat, _ ry: CGFloat) -> Path {
                Path(ellipseIn: CGRect(x: (cx - rx) * s, y: (cy - ry) * s, width: rx * 2 * s, height: ry * 2 * s))
            }
            func rotation(about cx: CGFloat, _ cy: CGFloat, degrees: CGFloat) -> CGAffineTransform {
                CGAffineTransform(translationX: cx * s, y: cy * s)
                    .rotated(by: degrees * .pi / 180)
                    .translatedBy(x: -cx * s, y: -cy * s)
            }

            let red = tint ?? Theme.cardinal
            let dark = tint ?? Theme.cardinalDark
            let mask = tint ?? Color(red: 0.15, green: 0.09, blue: 0.10)
            let beak = tint ?? Color(red: 0.93, green: 0.54, blue: 0.20)

            context.translateBy(x: 0, y: pose.bob * s)

            // Tail (flicks about its joint with the body)
            var tail = polygon([(58, 60), (84, 82), (75, 89), (53, 70)])
            if pose.tailLift != 0 {
                tail = tail.applying(rotation(about: 56, 62, degrees: -pose.tailLift))
            }
            context.fill(tail, with: .color(dark))
            // Body
            context.fill(ellipse(48, 57, 23, 21), with: .color(red))
            // Wing (rotated 32° about its center) — skipped for silhouettes
            if tint == nil {
                context.fill(ellipse(56, 58, 15, 9).applying(rotation(about: 56, 58, degrees: 32)),
                             with: .color(dark))
            }
            // Head and crest
            context.fill(ellipse(36, 32, 14, 14), with: .color(red))
            context.fill(polygon([(30, 22), (34, 4), (41, 20)]), with: .color(red))
            context.fill(polygon([(38, 20), (46, 7), (48, 22)]), with: .color(red))
            // Face mask, beak, eye
            if tint == nil {
                context.fill(polygon([(21, 34), (30, 26), (38, 31), (36, 42), (27, 44)]), with: .color(mask))
            }
            context.fill(polygon([(13, 33.5), (25, 28.5), (25, 38.5)]), with: .color(beak))
            if tint == nil {
                context.fill(ellipse(35, 27, 2.4, 2.4), with: .color(mask))
                if pose.isBlinking {
                    // Closed lid: a thin dark line where the eye was
                    context.fill(ellipse(35, 27, 2.4, 0.5), with: .color(.black.opacity(0.7)))
                } else {
                    context.fill(ellipse(35.9, 26.2, 0.8, 0.8), with: .color(.white.opacity(0.85)))
                }
            } else {
                context.fill(ellipse(35, 27, 2.6, pose.isBlinking ? 0.6 : 2.6), with: .color(Theme.cardinal))
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
