import SwiftUI

/// The app's cardinal emblem, drawn in code so it scales to any size.
/// Same geometry as the app icon. Pass `tint` for a single-color
/// silhouette (e.g. white on the reflection card); nil draws full color.
struct CardinalMark: View {
    var tint: Color? = nil

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

            let red = tint ?? Theme.cardinal
            let dark = tint ?? Theme.cardinalDark
            let mask = tint ?? Color(red: 0.15, green: 0.09, blue: 0.10)
            let beak = tint ?? Color(red: 0.93, green: 0.54, blue: 0.20)

            // Tail
            context.fill(polygon([(58, 60), (84, 82), (75, 89), (53, 70)]), with: .color(dark))
            // Body
            context.fill(ellipse(48, 57, 23, 21), with: .color(red))
            // Wing (rotated 32° about its center) — skipped for silhouettes
            if tint == nil {
                let rotation = CGAffineTransform(translationX: 56 * s, y: 58 * s)
                    .rotated(by: 32 * .pi / 180)
                    .translatedBy(x: -56 * s, y: -58 * s)
                context.fill(ellipse(56, 58, 15, 9).applying(rotation), with: .color(dark))
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
                context.fill(ellipse(35.9, 26.2, 0.8, 0.8), with: .color(.white.opacity(0.85)))
            } else {
                context.fill(ellipse(35, 27, 2.6, 2.6), with: .color(Theme.cardinal))
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .accessibilityHidden(true)
    }
}

#Preview {
    VStack(spacing: 30) {
        CardinalMark()
            .frame(width: 140)
        CardinalMark(tint: .white)
            .frame(width: 60)
            .padding()
            .background(Theme.reflectionGradient)
    }
    .padding()
}
