`default_nettype none

// CARD-1: a small demo ASIC in Tiny Tapeout format.
//
// Pin map (Tiny Tapeout standard interface):
//   ui_in[1:0]  count speed select (0 = slowest ... 3 = fastest)
//   ui_in[2]    pause counting while high
//   uo_out[6:0] 7-segment display (a..g, active high) showing a hex digit 0-F
//   uo_out[7]   PWM "breathing" LED
//   uio_*       unused (driven low, all inputs)
//
// TICK_DIV sets the base tick rate; at the Tiny Tapeout default 10 MHz clock,
// 5_000_000 gives a 2 Hz count at speed 0. The testbench overrides it so
// simulation doesn't need millions of cycles.
module tt_um_brizzi_card1 #(
    parameter TICK_DIV = 5_000_000
) (
    input  wire [7:0] ui_in,
    output wire [7:0] uo_out,
    input  wire [7:0] uio_in,
    output wire [7:0] uio_out,
    output wire [7:0] uio_oe,
    input  wire       ena,
    input  wire       clk,
    input  wire       rst_n
);
    wire [1:0] speed = ui_in[1:0];
    wire       pause = ui_in[2];

    // Base tick, sped up by right-shifting the divider: each speed step doubles
    // the count rate.
    wire [31:0] div_limit = TICK_DIV >> speed;

    reg [31:0] tick_cnt;
    wire tick = (tick_cnt >= div_limit - 1);

    always @(posedge clk) begin
        if (!rst_n)
            tick_cnt <= 0;
        else if (tick)
            tick_cnt <= 0;
        else
            tick_cnt <= tick_cnt + 1;
    end

    // Hex digit counter, 0-F wrapping.
    reg [3:0] digit;
    always @(posedge clk) begin
        if (!rst_n)
            digit <= 0;
        else if (tick && !pause)
            digit <= digit + 1;
    end

    // 7-segment decode, segments a-g in bits 0-6, active high.
    reg [6:0] seg;
    always @(*) begin
        case (digit)
            4'h0: seg = 7'b0111111;
            4'h1: seg = 7'b0000110;
            4'h2: seg = 7'b1011011;
            4'h3: seg = 7'b1001111;
            4'h4: seg = 7'b1100110;
            4'h5: seg = 7'b1101101;
            4'h6: seg = 7'b1111101;
            4'h7: seg = 7'b0000111;
            4'h8: seg = 7'b1111111;
            4'h9: seg = 7'b1101111;
            4'hA: seg = 7'b1110111;
            4'hB: seg = 7'b1111100;
            4'hC: seg = 7'b0111001;
            4'hD: seg = 7'b1011110;
            4'hE: seg = 7'b1111001;
            4'hF: seg = 7'b1110001;
        endcase
    end

    // Breathing LED: a triangle wave sets the PWM duty cycle. The triangle
    // phase advances on every base tick so the breath rate follows the speed
    // setting.
    reg [7:0] pwm_cnt;
    reg [7:0] phase;
    always @(posedge clk) begin
        if (!rst_n) begin
            pwm_cnt <= 0;
            phase   <= 0;
        end else begin
            pwm_cnt <= pwm_cnt + 1;
            if (tick)
                phase <= phase + 1;
        end
    end

    wire [7:0] duty = phase[7] ? ~{phase[6:0], 1'b0} : {phase[6:0], 1'b0};
    wire pwm_out = (pwm_cnt < duty);

    assign uo_out  = {pwm_out, seg};
    assign uio_out = 8'b0;
    assign uio_oe  = 8'b0;

    // Silence unused-signal lint warnings.
    wire _unused = &{ena, uio_in, ui_in[7:3], 1'b0};

endmodule
