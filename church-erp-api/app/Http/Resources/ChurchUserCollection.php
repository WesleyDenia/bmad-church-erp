<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\ResourceCollection;

class ChurchUserCollection extends ResourceCollection
{
    public $collects = ChurchUserResource::class;
}
