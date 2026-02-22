<?php

use PHPUnit\Framework\TestCase;

final class PaymentOrderBindingSmokeTest extends TestCase
{
    protected function setUp(): void
    {
        helper('payment_security');
    }

    public function testPendingOrderWithMatchingUserAndCourseIsAccepted(): void
    {
        $order = (object) [
            'user_id' => 1001,
            'course_id' => 2002,
            'order_status' => 'pending',
        ];

        $this->assertTrue(is_valid_order_binding($order, 1001, 2002));
    }

    public function testMismatchedOrderBindingIsRejected(): void
    {
        $order = (object) [
            'user_id' => 1001,
            'course_id' => 2002,
            'order_status' => 'pending',
        ];

        $this->assertFalse(is_valid_order_binding($order, 1009, 2002));
        $this->assertFalse(is_valid_order_binding($order, 1001, 2010));

        $order->order_status = 'completed';
        $this->assertFalse(is_valid_order_binding($order, 1001, 2002));
    }
}
