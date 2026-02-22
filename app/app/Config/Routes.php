<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */


$routes->get('/', 'Login::index');
if(!is_admin() && !is_instructor() && !is_counsellor() && !is_associate() && !is_subadmin()) {
    $routes->get('admin/(:any)', 'Login::index');
}

$routes->get('/file/', 'FileController::serveFile/');
$routes->get('/', 'VK_Course::index');
$routes->post('course/generate', 'VK_Course::generate');

//$routes->group('api', ['namespace' => 'App\Controllers\App'], function($routes) {
//    $routes->get('users', 'UsersController::index');
//    $routes->get('posts', 'PostsController::index');
//    // ... more API routes
//});

//$routes->group('app', ['filter' => 'auth'], function($routes) {
//    $routes->add('(:any)', 'App\$1::index');
//    $routes->add('(:any)/(:any)', 'App\$1::$2');
//    // Maps to App\[ControllerName]::[MethodName]
//});

