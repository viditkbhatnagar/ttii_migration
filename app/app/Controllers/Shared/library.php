<?php

function logData($phone, $data) {
    $logDir = "logs/";
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }

    $logFile = $logDir . $phone . ".log";
    $userAgent = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : "Unknown User Agent";
    $logData = date('d-m-Y g:i A') . " - " . json_encode($data) . " - User Agent: " . $userAgent . PHP_EOL;

    file_put_contents($logFile, $logData, FILE_APPEND);
    file_put_contents($logFile, '------------------------------------------------------------------------------------------------'."\n", FILE_APPEND);
}