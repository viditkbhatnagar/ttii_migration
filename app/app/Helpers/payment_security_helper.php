<?php

if (!function_exists('is_valid_order_binding')) {
    function is_valid_order_binding($orderDetails, int $userId, int $courseId): bool
    {
        if (!is_object($orderDetails)) {
            return false;
        }

        $orderUserId = (int) ($orderDetails->user_id ?? 0);
        $orderCourseId = (int) ($orderDetails->course_id ?? 0);
        $orderStatus = (string) ($orderDetails->order_status ?? '');

        if ($orderUserId !== $userId) {
            return false;
        }

        if ($orderCourseId !== $courseId) {
            return false;
        }

        return $orderStatus === 'pending';
    }
}
