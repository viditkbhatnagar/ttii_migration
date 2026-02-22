<?php
namespace App\Controllers\Admin;

use App\Models\Training_videos_model;
use App\Models\Course_model;
use App\Models\Users_model;

class Training_videos extends AppBaseController
{
    private $training_videos_model;
    private $course_model;
    private $users_model;

    public function __construct()
    {
        parent::__construct();

        $this->training_videos_model = new Training_videos_model();
        $this->course_model          = new Course_model();
        $this->users_model           = new Users_model();
    }

    public function index()
    {
        $this->data['list_items'] = $this->training_videos_model->get()->getResultArray();
        $this->data['page_title'] = 'Training Videos';
        $this->data['page_name']  = 'Training_videos/index';

        return view('Admin/index', $this->data);
    }

    public function ajax_add()
    {
        $this->data['courses'] = $this->course_model->get()->getResultArray();
        echo view('Admin/Training_videos/ajax_add', $this->data);
    }

    public function add()
    {
        if ($this->request->getMethod() === 'post') {

            // sanitize basic inputs
            $title = $this->request->getPost('title');
            $description = $this->request->getPost('description');
            $category = $this->request->getPost('category');
            $video_type = strtolower($this->request->getPost('video_type'));
            $video_url = $this->request->getPost('video_url');

            // Validate category/video_type
            if (!in_array($category, $this->allowed_categories)) {
                session()->setFlashdata('message_danger', 'Invalid category.');
                return redirect()->back();
            }
            if (!empty($video_type) && !in_array($video_type, $this->allowed_video_types)) {
                session()->setFlashdata('message_danger', 'Invalid video type.');
                return redirect()->back();
            }

            $data = [
                'title'         => $title,
                'description'   => $description,
                'category'      => $category,
                'video_type'    => $video_type,
                'video_url'     => $video_url,
                'created_by'    => get_user_id(),
                'created_at'    => date('Y-m-d H:i:s'),
            ];

            // 1) User uploaded thumbnail (preferred)
            $thumbFile = $this->upload_file('training_videos', 'thumbnail'); // returns ['file'=> 'training_videos/xyz.jpg'] in your setup
            if ($thumbFile && !empty($thumbFile['file'])) {
                $data['thumbnail'] = $thumbFile['file'];
            } else {
                // 2) Auto fetch only if video_type is youtube or vimeo, and URL present
                if (!empty($video_url) && in_array($video_type, $this->allowed_video_types)) {
                    $fetched = $this->fetch_and_save_remote_thumbnail($video_url, $video_type);
                    if ($fetched) {
                        $data['thumbnail'] = $fetched;
                    } else {
                        $data['thumbnail'] = '';
                    }
                } else {
                    $data['thumbnail'] = '';
                }
            }

            $inserted_id = $this->training_videos_model->add($data);

            if ($inserted_id) {
                session()->setFlashdata('message_success', "Added Successfully!");
            } else {
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }

        return redirect()->to(base_url('admin/training_videos/index'));
    }

    public function ajax_edit($id)
    {
        $this->data['courses'] = $this->course_model->get()->getResultArray();
        $this->data['edit_data'] = $this->training_videos_model->get(['id' => $id])->getRowArray();

        echo view('Admin/Training_videos/ajax_edit', $this->data);
    }

    public function edit($id)
    {
        if ($this->request->getMethod() === 'post') {

            $title = $this->request->getPost('title');
            $description = $this->request->getPost('description');
            $category = $this->request->getPost('category');
            $video_type = strtolower($this->request->getPost('video_type'));
            $video_url = $this->request->getPost('video_url');

            // Validate category/video_type
            if (!in_array($category, $this->allowed_categories)) {
                session()->setFlashdata('message_danger', 'Invalid category.');
                return redirect()->back();
            }
            if (!empty($video_type) && !in_array($video_type, $this->allowed_video_types)) {
                session()->setFlashdata('message_danger', 'Invalid video type.');
                return redirect()->back();
            }

            $data = [
                'title'         => $title,
                'description'   => $description,
                'category'      => $category,
                'video_type'    => $video_type,
                'video_url'     => $video_url,
                'updated_by'    => get_user_id(),
                'updated_at'    => date('Y-m-d H:i:s'),
            ];

            // Uploaded thumbnail replaces existing
            $thumbFile = $this->upload_file('training_videos', 'thumbnail');
            if ($thumbFile && !empty($thumbFile['file'])) {
                // optionally delete old thumbnail file here if you want
                // $old = $this->training_videos_model->get(['id' => $id])->getRowArray()['thumbnail'] ?? '';
                // unlink(WRITEPATH.'uploads/'.$old) etc...
                $data['thumbnail'] = $thumbFile['file'];
            } else {
                // if no uploaded thumbnail and video_url exists, try to auto fetch
                if (!empty($video_url) && in_array($video_type, $this->allowed_video_types)) {
                    $existing = $this->training_videos_model->get(['id' => $id])->getRowArray();
                    $existing_thumb = $existing['thumbnail'] ?? '';

                    // only fetch if no existing thumbnail
                    if (empty($existing_thumb)) {
                        $fetched = $this->fetch_and_save_remote_thumbnail($video_url, $video_type);
                        if ($fetched) {
                            $data['thumbnail'] = $fetched;
                        }
                    }
                }
            }

            $response = $this->training_videos_model->edit($data, ['id' => $id]);

            if ($response) {
                session()->setFlashdata('message_success', "Updated Successfully!");
            } else {
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        }

        return redirect()->to(base_url('admin/training_videos/index'));
    }

    public function ajax_view($id)
    {
        $this->data['view_data'] = $this->training_videos_model->get(['id' => $id])->getRowArray();
        echo view('Admin/Training_videos/ajax_view', $this->data);
    }

    public function delete($id)
    {
        if ($id > 0) {
            if ($this->training_videos_model->remove(['id' => $id])) {
                session()->setFlashdata('message_success', "Deleted Successfully!");
            } else {
                session()->setFlashdata('message_danger', "Something went wrong! Try Again");
            }
        } else {
            session()->setFlashdata('message_danger', "Invalid request!");
        }

        return redirect()->to(base_url('admin/training_videos/index'));
    }


    // Allowed values
    private $allowed_categories = ['Live', 'Lectures', 'Tutorials'];
    private $allowed_video_types = ['youtube', 'vimeo'];

    /**
     * Try to download a thumbnail for a YouTube or Vimeo URL and save it to uploads/training_videos.
     * Returns saved filename (relative path) on success, or null on failure.
     *
     * @param string $video_url
     * @param string $video_type  // 'youtube' or 'vimeo'
     * @return string|null
     */
    private function fetch_and_save_remote_thumbnail($video_url, $video_type)
    {
        // normalize
        $video_type = strtolower($video_type);
        $upload_folder = 'training_videos';

        // Build save dir to match upload_file() behavior: FCPATH/uploads/<folder>/<YYYYmm>/
        $saveDir = FCPATH . 'uploads/' . $upload_folder . '/' . date("Ym") . '/';
        if (!is_dir($saveDir)) {
            @mkdir($saveDir, 0777, true);
        }

        // Get remote thumbnail URL
        $thumb_url = null;

        if ($video_type === 'youtube') {
            // extract YouTube ID (supports normal and short URLs)
            if (preg_match('#(?:v=|\/v\/|youtu\.be\/|embed\/)([A-Za-z0-9_\-]{6,})#', $video_url, $m)) {
                $yt_id = $m[1];
                $thumb_url = "https://img.youtube.com/vi/{$yt_id}/hqdefault.jpg";
            }
        } elseif ($video_type === 'vimeo') {
            // Use Vimeo oEmbed to get thumbnail (requires remote request)
            $oembed = "https://vimeo.com/api/oembed.json?url=" . urlencode($video_url);
            $ch = curl_init($oembed);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 8);
            curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0');
            $resp = curl_exec($ch);
            $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if ($resp && $http === 200) {
                $data = json_decode($resp, true);
                if (!empty($data['thumbnail_url'])) {
                    $thumb_url = $data['thumbnail_url'];
                }
            }
        }

        if (empty($thumb_url)) {
            return null;
        }

        // Download remote image
        $ch = curl_init($thumb_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0');
        $imageData = curl_exec($ch);
        $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        curl_close($ch);

        if (!$imageData || $http !== 200) {
            return null;
        }

        // determine extension
        $ext = 'jpg';
        if (strpos($contentType, 'png') !== false) $ext = 'png';
        if (strpos($contentType, 'gif') !== false) $ext = 'gif';

        // create filename
        try {
            $rand = bin2hex(random_bytes(6));
        } catch (\Exception $e) {
            $rand = bin2hex(openssl_random_pseudo_bytes(6));
        }
        $filename = 'thumb_' . time() . '_' . $rand . '.' . $ext;
        $fullpath = $saveDir . $filename;

        if (@file_put_contents($fullpath, $imageData) === false) {
            return null;
        }

        // Return path in same format as upload_file() -> 'uploads/<folder>/<Ym>/<filename>'
        return 'uploads/' . $upload_folder . '/' . date("Ym") . '/' . $filename;
    }




}
