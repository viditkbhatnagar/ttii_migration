<?php
namespace App\Filters;

use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use CodeIgniter\Filters\FilterInterface;

class AppAuthFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        // $public_urls = ['app/home/login_success'];
        
        // if (!in_array($request->getPath(), $public_urls))
        // {
            // Check if the URL starts with 'app/'
            if (str_starts_with($request->getPath(), 'app/') || str_starts_with($request->getPath(), 'admin/')) {
                return check_login();
            }
        // }
        
        
        
        
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // Usually, nothing is needed here for an auth check
    }
}
