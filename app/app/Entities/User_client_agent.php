<?php namespace App\Entities;

use CodeIgniter\Entity\Entity;

class User_client_agent extends Entity
{
    protected $datamap = [];
    protected $dates   = ['created_at', 'updated_at', 'deleted_at'];
    protected $casts   = [];

}