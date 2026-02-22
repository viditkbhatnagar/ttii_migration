<!doctype html>
<html lang="en" data-layout="vertical" data-topbar="dark" data-sidebar="light" data-sidebar-size="lg" data-sidebar-image="none" data-preloader="disable">
<head>
    <meta charset="utf-8" />
    <title><?=get_site_title()?> - <?=$page_title?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta content="" name="description" />
    <meta content="Trogon" name="author" />
    <?php include_once __DIR__.'/header_includes.php'; ?>
    <style>
        .editor-content table {
            width: 100%;
            border-collapse: collapse;
        }
    
        .editor-content table, 
        .editor-content th, 
        .editor-content td {
            border: 1px solid #ddd;
            padding: 8px;
        }
    
        .editor-content ul,
        .editor-content ol {
            padding-left: 40px;
            margin-bottom: 1em;
        }
    
        .editor-content blockquote {
            padding: 10px 20px;
            margin: 20px 0;
            background: #f9f9f9;
            border-left: 5px solid #ccc;
        }
    </style>

</head>

<body>

<!-- Begin page -->
<div id="layout-wrapper">

    <?php include_once __DIR__.'/header_topbar.php'; ?>

    <!-- ========== App Menu ========== -->
    <?php include_once __DIR__.'/navigation.php'; ?>
    <!-- Left Sidebar End -->
    <!-- Vertical Overlay-->
    <div class="vertical-overlay"></div>

    <!-- ============================================================== -->
    <!-- Start right Content here -->
    <!-- ============================================================== -->
    <div class="main-content">
        <div class="page-content">
            <div class="container-fluid">
