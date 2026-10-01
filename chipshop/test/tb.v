`default_nettype none
`timescale 1ns / 1ps

// Self-checking testbench for CARD-1. Run with:
//   iverilog -o card1_tb src/tt_um_brizzi_card1.v test/tb.v && vvp card1_tb
// Exits with "ALL TESTS PASSED" or a FAIL message per broken check.
module tb;
    // Small divider so a "tick" takes 8 clocks at speed 0.
    localparam TICK_DIV = 8;

    reg  [7:0] ui_in;
    wire [7:0] uo_out;
    reg  [7:0] uio_in;
    wire [7:0] uio_out;
    wire [7:0] uio_oe;
    reg        ena;
    reg        clk;
    reg        rst_n;

    tt_um_brizzi_card1 #(.TICK_DIV(TICK_DIV)) dut (
        .ui_in(ui_in), .uo_out(uo_out),
        .uio_in(uio_in), .uio_out(uio_out), .uio_oe(uio_oe),
        .ena(ena), .clk(clk), .rst_n(rst_n)
    );

    always #5 clk = ~clk;

    integer errors = 0;

    task check(input cond, input [255:0] name);
        begin
            if (!cond) begin
                $display("FAIL: %0s", name);
                errors = errors + 1;
            end
        end
    endtask

    // Reference 7-seg decode for checking.
    function [6:0] seg_of(input [3:0] d);
        case (d)
            4'h0: seg_of = 7'b0111111;
            4'h1: seg_of = 7'b0000110;
            4'h2: seg_of = 7'b1011011;
            4'h3: seg_of = 7'b1001111;
            4'h4: seg_of = 7'b1100110;
            4'h5: seg_of = 7'b1101101;
            4'h6: seg_of = 7'b1111101;
            4'h7: seg_of = 7'b0000111;
            4'h8: seg_of = 7'b1111111;
            4'h9: seg_of = 7'b1101111;
            4'hA: seg_of = 7'b1110111;
            4'hB: seg_of = 7'b1111100;
            4'hC: seg_of = 7'b0111001;
            4'hD: seg_of = 7'b1011110;
            4'hE: seg_of = 7'b1111001;
            4'hF: seg_of = 7'b1110001;
        endcase
    endfunction

    integer i;

    initial begin
        clk = 0; ena = 1; ui_in = 0; uio_in = 0;

        // Reset.
        rst_n = 0;
        repeat (4) @(posedge clk);
        rst_n = 1;
        @(posedge clk); #1;

        check(dut.digit == 0, "digit is 0 after reset");
        check(uo_out[6:0] == seg_of(0), "segments show 0 after reset");
        check(uio_oe == 8'b0, "bidirectional pins are inputs");
        check(uio_out == 8'b0, "bidirectional outputs low");

        // One tick at speed 0 takes TICK_DIV clocks; digit should step to 1.
        repeat (TICK_DIV) @(posedge clk); #1;
        check(dut.digit == 1, "digit increments after one tick");
        check(uo_out[6:0] == seg_of(1), "segments show 1");

        // Pause: no counting while ui_in[2] is high.
        ui_in[2] = 1;
        repeat (3 * TICK_DIV) @(posedge clk); #1;
        check(dut.digit == 1, "digit holds while paused");
        ui_in[2] = 0;

        // Speed 1 halves the divider: two ticks in TICK_DIV clocks.
        ui_in[1:0] = 2'd1;
        repeat (TICK_DIV) @(posedge clk); #1;
        check(dut.digit == 3, "speed 1 counts twice as fast");
        ui_in[1:0] = 2'd0;

        // Count up to F and wrap to 0 (currently at 3, so 13 more ticks).
        repeat (13 * TICK_DIV) @(posedge clk); #1;
        check(dut.digit == 0, "digit wraps F -> 0");
        check(uo_out[6:0] == seg_of(0), "segments show 0 after wrap");

        // Every digit decodes to its reference pattern.
        for (i = 0; i < 16; i = i + 1) begin
            repeat (TICK_DIV) @(posedge clk); #1;
            check(uo_out[6:0] == seg_of(dut.digit), "segment decode matches digit");
        end

        // PWM output should actually toggle as the breath phase advances.
        begin : pwm_activity
            integer highs, lows;
            highs = 0; lows = 0;
            repeat (16 * TICK_DIV) @(posedge clk) begin
                if (uo_out[7]) highs = highs + 1; else lows = lows + 1;
            end
            check(highs > 0 && lows > 0, "PWM output toggles");
        end

        if (errors == 0)
            $display("ALL TESTS PASSED");
        else begin
            $display("%0d TEST(S) FAILED", errors);
            $fatal(1);
        end
        $finish;
    end
endmodule
