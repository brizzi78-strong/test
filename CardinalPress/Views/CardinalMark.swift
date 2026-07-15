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

            // Tail feathers — long, swept back, elegant
            var tail = polygon([(55, 68), (88, 70), (85, 82), (52, 80)])
            if pose.tailLift != 0 {
                tail = tail.applying(rotation(about: 54, 74, degrees: -pose.tailLift * 0.8))
            }
            context.fill(tail, with: .color(dark))

            // Body — rounded, substantial, smooth
            context.fill(ellipse(50, 65, 28, 26), with: .color(red))

            // Belly — lighter tone for dimension (red is already used)
            if tint == nil {
                context.fill(ellipse(48, 70, 22, 18), with: .color(Theme.cardinal.opacity(0.7)))
            }

            // Wing — curved, darker, well-defined
            if tint == nil {
                context.fill(ellipse(58, 64, 20, 12).applying(rotation(about: 58, 64, degrees: 25)),
                             with: .color(dark))
            }

            // Head — proportional, sits naturally on body
            context.fill(ellipse(40, 42, 17, 17), with: .color(red))

            // Crest feathers — iconic cardinal shape, pointed upward
            let crestHeight: CGFloat = 8 - (pose.tailLift > 0 ? pose.tailLift * 0.2 : 0)
            context.fill(polygon([(32, 32), (36, 2 - crestHeight), (41, 30)]), with: .color(red))
            context.fill(polygon([(41, 30), (46, 1 - crestHeight), (51, 33)]), with: .color(red))

            // Face & eye region
            if tint == nil {
                // Mask (darker face area)
                context.fill(polygon([(26, 40), (36, 35), (42, 39), (40, 50), (30, 52)]), with: .color(mask))
            }

            // Beak — stronger, more natural angle
            context.fill(polygon([(18, 40), (30, 37), (30, 43)]), with: .color(beak))

            // Eye
            if tint == nil {
                context.fill(ellipse(39, 36, 2.8, 2.8), with: .color(mask))
                if pose.isBlinking {
                    context.fill(ellipse(39, 36, 2.8, 0.5), with: .color(.black.opacity(0.8)))
                } else {
                    context.fill(ellipse(39.9, 35.1, 1.0, 1.0), with: .color(.white.opacity(1.0)))
                }
            } else {
                context.fill(ellipse(39, 36, 3.0, pose.isBlinking ? 0.5 : 3.0), with: .color(Theme.cardinal))
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
