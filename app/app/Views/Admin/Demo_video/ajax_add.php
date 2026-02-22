


<form action="<?=base_url('admin/demo_video/add')?>" enctype="multipart/form-data" method="post" id="lessonFileForm">
    <div class="row">
        
        <div class="col-12 form-group p-2">
            <label for="subject_id" class="form-label ">Course<span class="required text-danger">*</span></label>
            <select class="form-control select2" data-toggle="select2" name="course_id" id="course_id" required>
                <option value="">Select Course</option>
                <?php foreach($courses as $course){ ?>
                    <option value="<?=$course['id']?>"><?=$course['title']?></option>
                <?php } ?>
            </select>
        </div>
        
        <div class="col-lg-12 p-2">
            <div>
                <label for="title" class="form-label">Title<span class="required text-danger">*</span></label>
                <input type="text" class="form-control" id="title" name="title" required>
            </div>
        </div>
        
        <div class="col-lg-12 p-2">
            <div>
                <label for="video_type" class="form-label">Video Type<span class="required text-danger">*</span></label>
                <select class="form-control" name="video_type" id="video_type">
                    <option value="vimeo">Vimeo</option>
                </select>
            </div>
        </div>
    
        <div class="col-lg-12 p-2 youtube_vimeo">
            <div>
                <label for="video_url" class="form-label">Video URL<span class="required text-danger">*</span></label>
                <input type="text" id="video_url" name="video_url" class="form-control" placeholder="video url" onchange="checkURLValidity(this.value); cleanVimeoUrl();">
            </div>
        </div>
        
        <!--<div class="col-lg-12 p-2 youtube_vimeo">-->
        <!--    <div>-->
        <!--        <label for="duration" class="form-label">Duration<span class="required text-danger">*</span></label>-->
        <!--        <input type="text" name ="duration" id="duration" class="form-control" pattern="[0-9]{2}:[0-9]{2}:[0-9]{2}" value="00:00:00" placeholder="00:00:00">-->
        <!--    </div>-->
        <!--</div>-->
        
        <!--<div class="col-lg-12 p-2">-->
        <!--    <div>-->
        <!--        <label for="download_url" class="form-label">Download URL</label>-->
        <!--        <input type="text" name="download_url" id="download_url" class="form-control" value="">-->
        <!--    </div>-->
        <!--</div>-->
        
        <div class="col-lg-12 p-2">
            <div>
                <label for="thumbnail" class="form-label">Thumbnail<small>(Image size should be 979 x 551)</small></label>
                <input type="file" class="form-control" id="thumbnail" name="thumbnail">
            </div>
        </div>
   
        
        <!--<div class="col-lg-12 p-2">-->
        <!--    <div>-->
        <!--        <label for="summary" class="form-label">Description</label>-->
        <!--        <textarea class="form-control" id="summary" name="summary" ></textarea>-->
        <!--    </div>-->
        <!--</div>-->
        
        
        <div class="col-12 p-2">
            <button class="btn btn-success float-end btn-save" type="submit">
                <i class="ri-check-fill"></i> Save
            </button>
        </div>
    </div>
</form>

    